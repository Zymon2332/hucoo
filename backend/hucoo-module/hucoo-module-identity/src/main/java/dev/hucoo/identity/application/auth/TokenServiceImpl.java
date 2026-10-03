package dev.hucoo.identity.application.auth;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.CryptoUtil;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.component.security.util.JwtUtil;
import dev.hucoo.identity.api.dto.AuthSessionDTO;
import dev.hucoo.identity.api.dto.AuthTokenResponse;
import dev.hucoo.identity.config.AuthenticationProperties;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;
import dev.hucoo.identity.domain.auth.entity.AuthRefreshSession;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthIdentityUserMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthRefreshSessionMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class TokenServiceImpl implements TokenService {

    private final JwtUtil jwtUtil;
    private final AuthenticationProperties properties;
    private final AuthRefreshSessionMapper refreshSessionMapper;
    private final AuthIdentityUserMapper identityUserMapper;

    @Override
    @Transactional
    public AuthTokenResponse issue(AuthIdentityUser user, String clientId, String tenantId, String deviceId,
                                   List<String> availableTenantIds) {
        String refreshToken = CryptoUtil.randomToken(48);
        String family = IdGenerator.uuid();
        AuthRefreshSession session = createSession(user.getId(), clientId, tenantId, deviceId, refreshToken, family);
        refreshSessionMapper.insert(session);
        return tokenResponse(user, clientId, tenantId, refreshToken, session.getExpiresAt(), availableTenantIds,
                session.getId());
    }

    @Override
    @Transactional(noRollbackFor = BusinessException.class)
    public AuthTokenResponse refresh(String refreshToken, String clientId, String deviceId) {
        AuthRefreshSession current = refreshSessionMapper.selectByTokenHash(hash(refreshToken));
        if (current == null) {
            throw new BusinessException(CommonErrorCode.REFRESH_TOKEN_INVALID);
        }
        if (!"ACTIVE".equalsIgnoreCase(current.getSessionStatus())) {
            refreshSessionMapper.revokeFamily(current.getTokenFamily());
            throw new BusinessException(CommonErrorCode.REFRESH_TOKEN_REUSED);
        }
        if (current.getExpiresAt() == null || current.getExpiresAt().isBefore(LocalDateTime.now())) {
            current.setSessionStatus("EXPIRED");
            refreshSessionMapper.updateById(current);
            throw new BusinessException(CommonErrorCode.REFRESH_TOKEN_INVALID);
        }
        AuthIdentityUser user = identityUserMapper.selectById(current.getUserId());
        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException(CommonErrorCode.USER_DISABLED);
        }
        if (refreshSessionMapper.revokeIfActive(current.getId()) == 0) {
            refreshSessionMapper.revokeFamily(current.getTokenFamily());
            throw new BusinessException(CommonErrorCode.REFRESH_TOKEN_REUSED);
        }
        String nextRefreshToken = CryptoUtil.randomToken(48);
        AuthRefreshSession replacement = createSession(user.getId(),
                clientId == null ? current.getClientId() : clientId,
                current.getTenantId(),
                deviceId == null ? current.getDeviceId() : deviceId,
                nextRefreshToken,
                current.getTokenFamily());
        refreshSessionMapper.insert(replacement);
        current.setReplacedBy(replacement.getId());
        current.setSessionStatus("REVOKED");
        current.setRevokedAt(LocalDateTime.now());
        refreshSessionMapper.updateById(current);
        return tokenResponse(user, replacement.getClientId(), replacement.getTenantId(), nextRefreshToken,
                replacement.getExpiresAt(), List.of(replacement.getTenantId()), replacement.getId());
    }

    @Override
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        AuthRefreshSession session = refreshSessionMapper.selectByTokenHash(hash(refreshToken));
        if (session != null && "ACTIVE".equalsIgnoreCase(session.getSessionStatus())) {
            session.setSessionStatus("REVOKED");
            session.setRevokedAt(LocalDateTime.now());
            refreshSessionMapper.updateById(session);
        }
    }

    @Override
    public void revokeAll(Long userId) {
        refreshSessionMapper.revokeAllByUserId(userId);
    }

    @Override
    public void revokeSession(Long userId, Long sessionId) {
        refreshSessionMapper.revokeByUserAndSession(userId, sessionId);
    }

    @Override
    public List<AuthSessionDTO> sessions(Long userId) {
        return refreshSessionMapper.selectByUserId(userId).stream()
                .map(session -> AuthSessionDTO.builder()
                        .sessionId(String.valueOf(session.getId()))
                        .clientId(session.getClientId())
                        .deviceId(session.getDeviceId())
                        .tenantId(session.getTenantId())
                        .status(session.getSessionStatus())
                        .expiresAt(session.getExpiresAt() == null ? null : session.getExpiresAt().toString())
                        .createdAt(session.getCreatedAt() == null ? null : session.getCreatedAt().toString())
                        .build())
                .toList();
    }

    private AuthRefreshSession createSession(Long userId, String clientId, String tenantId, String deviceId,
                                             String refreshToken, String family) {
        AuthRefreshSession session = new AuthRefreshSession();
        session.setId(IdGenerator.nextId());
        session.setUserId(userId);
        session.setTenantId(tenantId);
        session.setClientId(clientId == null || clientId.isBlank() ? "ADMIN_CONSOLE" : clientId);
        session.setDeviceId(deviceId);
        session.setTokenHash(hash(refreshToken));
        session.setTokenFamily(family);
        session.setExpiresAt(LocalDateTime.now().plusDays(properties.getRefreshTokenTtlDays()));
        session.setSessionStatus("ACTIVE");
        session.setDeleted(0);
        session.setVersion(0);
        return session;
    }

    private AuthTokenResponse tokenResponse(AuthIdentityUser user, String clientId, String tenantId,
                                            String refreshToken, LocalDateTime refreshExpiresAt,
                                            List<String> availableTenantIds, Long sessionId) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("userId", user.getId());
        claims.put("username", user.getUsername());
        claims.put("tenantId", tenantId);
        claims.put("clientId", clientId);
        claims.put("sessionId", sessionId);
        claims.put("tokenVersion", 1);
        String accessToken = jwtUtil.createToken(String.valueOf(user.getId()), claims,
                Duration.ofMinutes(properties.getAccessTokenTtlMinutes()));
        return AuthTokenResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(Duration.ofMinutes(properties.getAccessTokenTtlMinutes()).toSeconds())
                .refreshToken(refreshToken)
                .refreshTokenExpiresAt(refreshExpiresAt.toString())
                .userId(user.getId())
                .username(user.getUsername())
                .tenantId(tenantId)
                .availableTenantIds(availableTenantIds)
                .build();
    }

    private String hash(String token) {
        return CryptoUtil.sha256Hex(token);
    }
}
