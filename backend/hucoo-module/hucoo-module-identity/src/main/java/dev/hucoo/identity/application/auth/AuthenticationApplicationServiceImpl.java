package dev.hucoo.identity.application.auth;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import dev.hucoo.commons.api.AuditEventPublisher;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.CryptoUtil;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;
import jakarta.servlet.http.HttpServletRequest;
import dev.hucoo.identity.api.AuthenticationFacade;
import dev.hucoo.identity.api.dto.AuthLoginRequest;
import dev.hucoo.identity.api.dto.AuthOAuthAuthorizeResponse;
import dev.hucoo.identity.api.dto.AuthOAuthCallbackRequest;
import dev.hucoo.identity.api.dto.AuthOAuthCallbackResponse;
import dev.hucoo.identity.api.dto.AuthProviderDTO;
import dev.hucoo.identity.api.dto.AuthRefreshRequest;
import dev.hucoo.identity.api.dto.AuthRegisterRequest;
import dev.hucoo.identity.api.dto.AuthSessionDTO;
import dev.hucoo.identity.api.dto.AuthTokenResponse;
import dev.hucoo.identity.api.dto.AuthVerificationCodeRequest;
import dev.hucoo.identity.config.AuthenticationProperties;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;
import dev.hucoo.identity.domain.auth.entity.AuthLoginIdentity;
import dev.hucoo.identity.domain.auth.entity.AuthPasswordCredential;
import dev.hucoo.identity.domain.auth.entity.AuthTenantMembership;
import dev.hucoo.identity.domain.auth.entity.AuthVerificationChallenge;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;
import dev.hucoo.identity.domain.auth.enums.IdentityUserStatus;
import dev.hucoo.identity.domain.auth.enums.VerificationChannel;
import dev.hucoo.identity.domain.auth.enums.VerificationPurpose;
import dev.hucoo.identity.api.dto.UserAccountCreateRequest;
import dev.hucoo.identity.domain.entity.UserAccount;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthIdentityUserMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthLoginIdentityMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthPasswordCredentialMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthTenantMembershipMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthVerificationChallengeMapper;
import dev.hucoo.identity.infrastructure.mapper.UserAccountMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class AuthenticationApplicationServiceImpl implements AuthenticationApplicationService {

    private final AuthenticationProperties properties;
    private final AuthIdentityUserMapper identityUserMapper;
    private final AuthLoginIdentityMapper loginIdentityMapper;
    private final AuthPasswordCredentialMapper passwordCredentialMapper;
    private final AuthTenantMembershipMapper membershipMapper;
    private final AuthVerificationChallengeMapper verificationChallengeMapper;
    private final UserAccountMapper userAccountMapper;
    private final LoginAuthenticatorRegistry authenticatorRegistry;
    private final OAuthProviderRegistry oauthProviderRegistry;
    private final VerificationCodeSenderRegistry senderRegistry;
    private final TokenService tokenService;
    private final PasswordHasher passwordHasher;
    private final ObjectProvider<AuditEventPublisher> auditPublisher;

    @Override
    @Transactional
    public AuthenticationFacade.AuthRegisterResult register(AuthRegisterRequest request) {
        ensureEnabled();
        String identifier = AuthenticationIdentifier.normalize(request.getIdentifier());
        if (loginIdentityMapper.selectByIdentifier(AuthenticationMethod.PASSWORD.name(), identifier) != null) {
            throw new BusinessException(CommonErrorCode.CONFLICT, "账号已存在");
        }
        long userId = IdGenerator.nextId();
        AuthIdentityUser user = new AuthIdentityUser();
        user.setId(userId);
        user.setUsername(identifier);
        user.setDisplayName(request.getDisplayName() == null || request.getDisplayName().isBlank()
                ? identifier : request.getDisplayName().trim());
        user.setStatus(IdentityUserStatus.PENDING.name());
        user.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        user.setDeleted(0);
        user.setVersion(0);
        identityUserMapper.insert(user);

        AuthLoginIdentity identity = new AuthLoginIdentity();
        identity.setId(IdGenerator.nextId());
        identity.setUserId(userId);
        identity.setMethod(AuthenticationMethod.PASSWORD.name());
        identity.setIdentifier(identifier);
        identity.setVerifiedAt(null);
        identity.setStatus("ACTIVE");
        identity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        identity.setDeleted(0);
        identity.setVersion(0);
        loginIdentityMapper.insert(identity);
        if (AuthenticationIdentifier.looksLikeEmail(identifier)) {
            insertLoginIdentity(userId, AuthenticationMethod.EMAIL, identifier);
        } else if (identifier.matches("\\+?[0-9][0-9 -]{6,31}")) {
            insertLoginIdentity(userId, AuthenticationMethod.SMS, identifier);
        }

        AuthPasswordCredential credential = new AuthPasswordCredential();
        credential.setId(IdGenerator.nextId());
        credential.setUserId(userId);
        credential.setPasswordHash(passwordHasher.hash(request.getPassword()));
        credential.setFailedAttempts(0);
        credential.setPasswordChangedAt(LocalDateTime.now());
        credential.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        credential.setDeleted(0);
        credential.setVersion(0);
        passwordCredentialMapper.insert(credential);

        UserAccount legacyAccount = new UserAccount();
        legacyAccount.setId(userId);
        legacyAccount.setUsername(identifier);
        legacyAccount.setDisplayName(user.getDisplayName());
        if (AuthenticationIdentifier.looksLikeEmail(identifier)) {
            legacyAccount.setEmail(identifier);
        } else {
            legacyAccount.setPhone(identifier);
        }
        legacyAccount.setStatus(0);
        legacyAccount.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        legacyAccount.setDeleted(0);
        legacyAccount.setVersion(0);
        userAccountMapper.insert(legacyAccount);
        publishAudit(userId, identifier, PlatformConstants.SYSTEM_TENANT_ID, "auth:register", 1);
        return new AuthenticationFacade.AuthRegisterResult(userId, identifier, user.getStatus());
    }

    @Override
    public AuthTokenResponse login(AuthLoginRequest request) {
        ensureEnabled();
        AuthenticationMethod method = parseMethod(request.getMethod());
        if (!properties.isProviderEnabled(method.name())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "认证方式未启用: " + method);
        }
        AuthenticatedIdentity authenticated = authenticatorRegistry.authenticate(method,
                new AuthenticationCommand(request.getIdentifier(), request.getCredential(), request.getClientId(),
                        request.getTenantId(), request.getDeviceId()));
        AuthIdentityUser user = identityUserMapper.selectById(authenticated.userId());
        List<String> tenantIds = membershipMapper.selectActiveByUserId(user.getId()).stream()
                .map(AuthTenantMembership::getTenantId)
                .toList();
        if (tenantIds.isEmpty()) {
            UserAccount legacyAccount = userAccountMapper.selectById(user.getId());
            if (legacyAccount != null && Integer.valueOf(1).equals(legacyAccount.getStatus())
                    && legacyAccount.getTenantId() != null) {
                tenantIds = List.of(legacyAccount.getTenantId());
            }
        }
        if (tenantIds.isEmpty()) {
            throw new BusinessException(CommonErrorCode.TENANT_MEMBERSHIP_REQUIRED);
        }
        String tenantId = request.getTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            tenantId = tenantIds.getFirst();
        }
        if (!tenantIds.contains(tenantId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN, "不能访问指定租户");
        }
        AuthTokenResponse token = tokenService.issue(user, request.getClientId(), tenantId, request.getDeviceId(), tenantIds);
        publishAudit(user.getId(), user.getUsername(), tenantId, "auth:login:" + method.name().toLowerCase(Locale.ROOT), 1);
        return token;
    }

    @Override
    public AuthTokenResponse refresh(AuthRefreshRequest request) {
        return tokenService.refresh(request.getRefreshToken(), request.getClientId(), request.getDeviceId());
    }

    @Override
    public AuthOAuthAuthorizeResponse oauthAuthorize(String provider, String clientId, String redirectUri) {
        AuthenticationMethod method = parseMethod(provider);
        if (method != AuthenticationMethod.WECHAT && method != AuthenticationMethod.QQ) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不是 OAuth 认证方式: " + provider);
        }
        if (!properties.isProviderEnabled(method.name())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "认证方式未启用: " + method);
        }
        String state = IdGenerator.uuid();
        String authorizationUrl = oauthProviderRegistry.require(method).authorize(clientId, redirectUri, state);
        return AuthOAuthAuthorizeResponse.builder()
                .provider(method.name())
                .authorizationUrl(authorizationUrl)
                .state(state)
                .build();
    }

    @Override
    public AuthOAuthCallbackResponse oauthCallback(String provider, AuthOAuthCallbackRequest request) {
        AuthenticationMethod method = parseMethod(provider);
        if (method != AuthenticationMethod.WECHAT && method != AuthenticationMethod.QQ) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不是 OAuth 认证方式: " + provider);
        }
        if (!properties.isProviderEnabled(method.name())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "认证方式未启用: " + method);
        }
        OAuthProviderAdapter.ExternalIdentity external = oauthProviderRegistry.require(method)
                .exchange(request.getCode(), request.getState());
        AuthLoginIdentity identity = loginIdentityMapper.selectByProviderSubject(method.name(), external.subject());
        return AuthOAuthCallbackResponse.builder()
                .provider(method.name())
                .subject(external.subject())
                .displayName(external.displayName())
                .email(external.email())
                .bound(identity != null)
                .build();
    }

    @Override
    public void logout(String refreshToken) {
        tokenService.revoke(refreshToken);
        CurrentUser currentUser = CurrentUserContext.get();
        if (currentUser != null) {
            publishAudit(currentUser.userId(), currentUser.username(), currentUser.tenantId(), "auth:logout", 1);
        }
    }

    @Override
    public AuthIdentityUser currentUser() {
        CurrentUser currentUser = CurrentUserContext.require();
        AuthIdentityUser user = identityUserMapper.selectById(currentUser.userId());
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    @Override
    public List<AuthSessionDTO> sessions() {
        return tokenService.sessions(CurrentUserContext.require().userId());
    }

    @Override
    public void revokeSession(Long sessionId) {
        tokenService.revokeSession(CurrentUserContext.require().userId(), sessionId);
    }

    @Override
    public List<AuthProviderDTO> providers() {
        return List.of(AuthenticationMethod.values()).stream()
                .map(method -> AuthProviderDTO.builder()
                        .method(method.name())
                        .enabled(properties.isProviderEnabled(method.name()))
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void sendVerificationCode(AuthVerificationCodeRequest request) {
        VerificationChannel channel = parseChannel(request.getChannel());
        VerificationPurpose purpose = parsePurpose(request.getPurpose());
        if (!properties.isProviderEnabled(channel.name())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "认证方式未启用: " + channel);
        }
        String destination = request.getDestination().trim().toLowerCase(Locale.ROOT);
        if (verificationChallengeMapper.countRecent(channel.name(), purpose.name(), destination) > 0) {
            throw new BusinessException(CommonErrorCode.VERIFICATION_CODE_RATE_LIMITED);
        }
        String code = IdGenerator.randomNumeric(6);
        senderRegistry.send(channel, destination, code, purpose);
        AuthVerificationChallenge challenge = new AuthVerificationChallenge();
        challenge.setId(IdGenerator.nextId());
        challenge.setChannel(channel.name());
        challenge.setPurpose(purpose.name());
        challenge.setDestination(destination);
        challenge.setCodeHash(CryptoUtil.sha256Hex(code));
        challenge.setExpiresAt(LocalDateTime.now().plusSeconds(properties.getVerificationCodeTtlSeconds()));
        challenge.setAttempts(0);
        challenge.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        challenge.setDeleted(0);
        challenge.setVersion(0);
        verificationChallengeMapper.insert(challenge);
    }

    @Override
    @Transactional
    public void activate(Long userId, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "tenantId 不能为空");
        }
        AuthIdentityUser user = identityUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        user.setStatus(IdentityUserStatus.ACTIVE.name());
        user.setActivatedAt(LocalDateTime.now());
        identityUserMapper.updateById(user);

        AuthTenantMembership membership = membershipMapper.selectByUserAndTenant(userId, tenantId);
        if (membership == null) {
            membership = new AuthTenantMembership();
            membership.setId(IdGenerator.nextId());
            membership.setUserId(userId);
            membership.setTenantId(tenantId);
            membership.setMembershipStatus("ACTIVE");
            membership.setSource("ADMIN");
            membership.setDefaultMembership(1);
            membership.setDeleted(0);
            membership.setVersion(0);
            membershipMapper.insert(membership);
        } else {
            membership.setMembershipStatus("ACTIVE");
            membershipMapper.updateById(membership);
        }

        UserAccount legacyAccount = userAccountMapper.selectById(userId);
        if (legacyAccount != null) {
            legacyAccount.setStatus(1);
            legacyAccount.setTenantId(tenantId);
            userAccountMapper.updateById(legacyAccount);
        }
    }

    private void publishAudit(Long userId, String username, String tenantId, String action, int result) {
        AuditEventPublisher publisher = auditPublisher.getIfAvailable();
        if (publisher == null) {
            return;
        }
        HttpServletRequest request = null;
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            request = attributes.getRequest();
        }
        publisher.publish(new AuditEventPublisher.AuditEvent(
                userId,
                username,
                tenantId,
                action,
                "Authentication",
                userId == null ? null : String.valueOf(userId),
                result,
                request == null ? null : request.getRemoteAddr(),
                request == null ? null : MDC.get(PlatformConstants.TRACE_ID_MDC_KEY)));
    }

    private void insertLoginIdentity(Long userId, AuthenticationMethod method, String identifier) {
        AuthLoginIdentity loginIdentity = new AuthLoginIdentity();
        loginIdentity.setId(IdGenerator.nextId());
        loginIdentity.setUserId(userId);
        loginIdentity.setMethod(method.name());
        loginIdentity.setIdentifier(identifier);
        loginIdentity.setVerifiedAt(LocalDateTime.now());
        loginIdentity.setStatus("ACTIVE");
        loginIdentity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        loginIdentity.setDeleted(0);
        loginIdentity.setVersion(0);
        loginIdentityMapper.insert(loginIdentity);
    }

    private void ensureEnabled() {
        if (!properties.isEnabled()) {
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, "认证模块未启用");
        }
    }

    private AuthenticationMethod parseMethod(String value) {
        try {
            return AuthenticationMethod.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不支持的认证方式: " + value);
        }
    }

    private VerificationChannel parseChannel(String value) {
        try {
            return VerificationChannel.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不支持的验证码渠道: " + value);
        }
    }

    private VerificationPurpose parsePurpose(String value) {
        try {
            return VerificationPurpose.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不支持的验证码用途: " + value);
        }
    }
}
