package dev.hucoo.identity.application.auth.mock;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.CryptoUtil;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.component.security.config.SecurityProperties;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.security.util.JwtUtil;
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
import dev.hucoo.identity.application.auth.AuthenticationApplicationService;
import dev.hucoo.identity.application.auth.AuthenticationIdentifier;
import dev.hucoo.identity.application.auth.PasswordHasher;
import dev.hucoo.identity.config.AuthenticationProperties;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;
import dev.hucoo.identity.domain.auth.enums.IdentityUserStatus;

/**
 * 认证模块的 Mock 实现：{@code agent-platform.persistence.enabled=false} 时启用。
 *
 * <p>与其他业务模块的 {@code Mock*ApplicationService} 保持一致的模式，让本地开发无需 PostgreSQL、
 * Redis、Nacos 即可跑通登录链路。真实实现 {@code AuthenticationApplicationServiceImpl} 依赖数据库，
 * 未启用持久化时不会注册，此前会导致 {@code AuthenticationController} 因
 * {@code @ConditionalOnBean} 不满足而整体缺席。
 *
 * <p>访问令牌使用与 {@code TokenServiceImpl} 相同的 {@link JwtUtil} 与签名密钥签发，
 * 因此 {@code PermissionInterceptor} 能正常解析；额外写入 {@code permissions} 声明，
 * 使带 {@code @RequirePermission} 的端点也能在本地通过鉴权。
 *
 * <p>仅用于本地联调，账号与令牌保存在内存中，重启即失效，不要用于生产环境。
 */
@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false",
        matchIfMissing = true)
public class MockAuthenticationApplicationService implements AuthenticationApplicationService {

    /** 内置演示账号（admin / operator）的密码；注册账号使用各自注册时设置的密码。 */
    public static final String DEMO_PASSWORD = "Admin@12345";

    private static final String DEFAULT_CLIENT_ID = "ADMIN_CONSOLE";
    private static final String SESSION_ACTIVE = "ACTIVE";
    private static final String SESSION_REVOKED = "REVOKED";
    private static final List<String> ALL_PERMISSIONS = List.of("*");

    private final AuthenticationProperties authenticationProperties;
    private final JwtUtil jwtUtil;
    private final PasswordHasher passwordHasher;
    private final long accessTokenTtlMinutes;
    private final long refreshTokenTtlDays;

    private final Map<Long, AuthIdentityUser> users = new ConcurrentHashMap<>();
    private final Map<String, Long> identifiers = new ConcurrentHashMap<>();
    private final Map<Long, String> passwordHashes = new ConcurrentHashMap<>();
    private final Map<String, Long> refreshTokens = new ConcurrentHashMap<>();
    private final Map<Long, RefreshSession> sessions = new ConcurrentHashMap<>();
    private final AtomicLong sessionSequence = new AtomicLong(1);

    public MockAuthenticationApplicationService(AuthenticationProperties authenticationProperties,
                                                SecurityProperties securityProperties,
                                                PasswordHasher passwordHasher) {
        this.authenticationProperties = authenticationProperties;
        this.accessTokenTtlMinutes = authenticationProperties.getAccessTokenTtlMinutes();
        this.refreshTokenTtlDays = authenticationProperties.getRefreshTokenTtlDays();
        this.jwtUtil = new JwtUtil(securityProperties.getJwtSecret(), securityProperties.getJwtKeyId());
        this.passwordHasher = passwordHasher;
        seed();
    }

    @Override
    public AuthenticationFacade.AuthRegisterResult register(AuthRegisterRequest request) {
        ensureEnabled();
        String identifier = AuthenticationIdentifier.normalize(request.getIdentifier());
        if (identifiers.containsKey(key(AuthenticationMethod.PASSWORD, identifier))) {
            throw new BusinessException(CommonErrorCode.CONFLICT, "账号已存在");
        }
        long userId = IdGenerator.nextId();
        AuthIdentityUser user = new AuthIdentityUser();
        user.setId(userId);
        user.setUsername(identifier);
        user.setDisplayName(request.getDisplayName() == null || request.getDisplayName().isBlank()
                ? identifier : request.getDisplayName().trim());
        // Mock 模式没有管理员激活环节，注册即激活，便于本地直接登录。
        user.setStatus(IdentityUserStatus.ACTIVE.name());
        user.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        user.setActivatedAt(LocalDateTime.now());
        users.put(userId, user);
        identifiers.put(key(AuthenticationMethod.PASSWORD, identifier), userId);
        passwordHashes.put(userId, passwordHasher.hash(request.getPassword()));
        if (AuthenticationIdentifier.looksLikeEmail(identifier)) {
            identifiers.put(key(AuthenticationMethod.EMAIL, identifier), userId);
        } else if (identifier.matches("\\+?[0-9][0-9 -]{6,31}")) {
            identifiers.put(key(AuthenticationMethod.SMS, identifier), userId);
        }
        return new AuthenticationFacade.AuthRegisterResult(userId, identifier, user.getStatus());
    }

    @Override
    public AuthTokenResponse login(AuthLoginRequest request) {
        ensureEnabled();
        AuthenticationMethod method = parseMethod(request.getMethod());
        if (!authenticationProperties.isProviderEnabled(method.name())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "认证方式未启用: " + method);
        }
        if (method != AuthenticationMethod.PASSWORD) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "Mock 认证仅支持 PASSWORD 方式: " + method);
        }
        String identifier = AuthenticationIdentifier.normalize(request.getIdentifier());
        Long userId = identifiers.get(key(AuthenticationMethod.PASSWORD, identifier));
        if (userId == null || !passwordMatches(userId, request.getCredential())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_FAILED, "账号或凭证错误");
        }
        AuthIdentityUser user = users.get(userId);
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        if (!IdentityUserStatus.ACTIVE.name().equals(user.getStatus())) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN, "账号未激活: " + user.getStatus());
        }
        String tenantId = request.getTenantId() == null || request.getTenantId().isBlank()
                ? PlatformConstants.SYSTEM_TENANT_ID : request.getTenantId();
        return issue(user, request.getClientId(), tenantId, request.getDeviceId(), List.of(tenantId));
    }

    @Override
    public AuthTokenResponse refresh(AuthRefreshRequest request) {
        ensureEnabled();
        String refreshToken = request.getRefreshToken();
        Long userId = refreshTokens.get(refreshToken);
        if (userId == null) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "refreshToken 无效或已撤销");
        }
        RefreshSession session = sessions.get(userId);
        if (session == null || session.refreshToken() == null
                || !CryptoUtil.secureEquals(session.refreshToken(), refreshToken)) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "refreshToken 已失效");
        }
        if (session.expiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "refreshToken 已过期");
        }
        AuthIdentityUser user = users.get(userId);
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        // 刷新时轮换 refreshToken，与真实实现的会话族语义保持一致。
        return issue(user, request.getClientId(), session.tenantId(), request.getDeviceId(),
                List.of(session.tenantId()));
    }

    @Override
    public AuthOAuthAuthorizeResponse oauthAuthorize(String provider, String clientId, String redirectUri) {
        AuthenticationMethod method = requireOAuthProvider(provider);
        String state = IdGenerator.uuid();
        String authorizationUrl = "https://mock." + method.name().toLowerCase(Locale.ROOT)
                + ".local/oauth/authorize?client_id=" + clientId + "&redirect_uri=" + redirectUri
                + "&state=" + state;
        return AuthOAuthAuthorizeResponse.builder()
                .provider(method.name())
                .authorizationUrl(authorizationUrl)
                .state(state)
                .build();
    }

    @Override
    public AuthOAuthCallbackResponse oauthCallback(String provider, AuthOAuthCallbackRequest request) {
        AuthenticationMethod method = requireOAuthProvider(provider);
        String subject = "mock-" + method.name().toLowerCase(Locale.ROOT) + "-" + request.getCode();
        return AuthOAuthCallbackResponse.builder()
                .provider(method.name())
                .subject(subject)
                .displayName("Mock " + method.name())
                .email(subject + "@mock.local")
                .bound(identifiers.containsKey(key(method, subject)))
                .build();
    }

    @Override
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        Long userId = refreshTokens.remove(refreshToken);
        if (userId != null) {
            sessions.computeIfPresent(userId, (id, session) -> session.revoked());
        }
    }

    @Override
    public AuthIdentityUser currentUser() {
        CurrentUser currentUser = CurrentUserContext.require();
        AuthIdentityUser user = users.get(currentUser.userId());
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    @Override
    public List<AuthSessionDTO> sessions() {
        Long userId = CurrentUserContext.require().userId();
        RefreshSession session = sessions.get(userId);
        if (session == null) {
            return List.of();
        }
        return List.of(AuthSessionDTO.builder()
                .sessionId(String.valueOf(session.sessionId()))
                .clientId(session.clientId())
                .deviceId(session.deviceId())
                .tenantId(session.tenantId())
                .status(session.status())
                .expiresAt(session.expiresAt().toString())
                .createdAt(session.createdAt().toString())
                .build());
    }

    @Override
    public void revokeSession(Long sessionId) {
        Long userId = CurrentUserContext.require().userId();
        RefreshSession session = sessions.get(userId);
        if (session == null || !session.sessionId().equals(sessionId)) {
            return;
        }
        if (session.refreshToken() != null) {
            refreshTokens.remove(session.refreshToken());
        }
        sessions.put(userId, session.revoked());
    }

    @Override
    public List<AuthProviderDTO> providers() {
        List<AuthProviderDTO> providers = new ArrayList<>();
        for (AuthenticationMethod method : AuthenticationMethod.values()) {
            providers.add(AuthProviderDTO.builder()
                    .method(method.name())
                    // Mock 只实现了 PASSWORD，其余方式即便配置开启也无法登录，这里如实反映。
                    .enabled(method == AuthenticationMethod.PASSWORD
                            && authenticationProperties.isProviderEnabled(method.name()))
                    .build());
        }
        return providers;
    }

    @Override
    public void sendVerificationCode(AuthVerificationCodeRequest request) {
        throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                "Mock 认证未实现验证码发送: " + request.getChannel());
    }

    @Override
    public void activate(Long userId, String tenantId) {
        AuthIdentityUser user = users.get(userId);
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        user.setStatus(IdentityUserStatus.ACTIVE.name());
        user.setActivatedAt(LocalDateTime.now());
    }

    private AuthTokenResponse issue(AuthIdentityUser user, String clientId, String tenantId, String deviceId,
                                    List<String> availableTenantIds) {
        long sessionId = sessionSequence.getAndIncrement();
        String refreshToken = IdGenerator.uuid();
        LocalDateTime refreshExpiresAt = LocalDateTime.now().plusDays(refreshTokenTtlDays);
        String effectiveClientId = clientId == null || clientId.isBlank() ? DEFAULT_CLIENT_ID : clientId;

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("userId", user.getId());
        claims.put("username", user.getUsername());
        claims.put("tenantId", tenantId);
        claims.put("clientId", effectiveClientId);
        claims.put("sessionId", sessionId);
        claims.put("tokenVersion", 1);
        claims.put("permissions", ALL_PERMISSIONS);
        String accessToken = jwtUtil.createToken(String.valueOf(user.getId()), claims,
                Duration.ofMinutes(accessTokenTtlMinutes));

        if (refreshTokens.containsValue(user.getId())) {
            refreshTokens.entrySet().removeIf(entry -> entry.getValue().equals(user.getId()));
        }
        refreshTokens.put(refreshToken, user.getId());
        sessions.put(user.getId(), new RefreshSession(sessionId, effectiveClientId, deviceId, tenantId,
                refreshToken, SESSION_ACTIVE, refreshExpiresAt, LocalDateTime.now()));

        return AuthTokenResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(Duration.ofMinutes(accessTokenTtlMinutes).toSeconds())
                .refreshToken(refreshToken)
                .refreshTokenExpiresAt(refreshExpiresAt.toString())
                .userId(user.getId())
                .username(user.getUsername())
                .tenantId(tenantId)
                .availableTenantIds(availableTenantIds)
                .build();
    }

    /**
     * 注册账号校验各自注册时设置的密码；内置演示账号（admin / operator）没有密码记录，沿用统一演示密码。
     */
    private boolean passwordMatches(Long userId, String credential) {
        if (credential == null || credential.isBlank()) {
            return false;
        }
        String hash = passwordHashes.get(userId);
        return hash == null ? DEMO_PASSWORD.equals(credential) : passwordHasher.matches(credential, hash);
    }

    private void seed() {
        createDemoUser("admin", "平台管理员");
        createDemoUser("operator", "运营人员");
    }

    private void createDemoUser(String username, String displayName) {
        long userId = IdGenerator.nextId();
        AuthIdentityUser user = new AuthIdentityUser();
        user.setId(userId);
        user.setUsername(username);
        user.setDisplayName(displayName);
        user.setStatus(IdentityUserStatus.ACTIVE.name());
        user.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        user.setActivatedAt(LocalDateTime.now());
        users.put(userId, user);
        identifiers.put(key(AuthenticationMethod.PASSWORD, username), userId);
    }

    private AuthenticationMethod requireOAuthProvider(String provider) {
        AuthenticationMethod method = parseMethod(provider);
        if (method != AuthenticationMethod.WECHAT && method != AuthenticationMethod.QQ) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不是 OAuth 认证方式: " + provider);
        }
        if (!authenticationProperties.isProviderEnabled(method.name())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_METHOD_DISABLED,
                    "认证方式未启用: " + method);
        }
        return method;
    }

    private AuthenticationMethod parseMethod(String value) {
        try {
            return AuthenticationMethod.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不支持的认证方式: " + value);
        }
    }

    private String key(AuthenticationMethod method, String identifier) {
        return method.name() + ':' + identifier;
    }

    private void ensureEnabled() {
        if (!authenticationProperties.isEnabled()) {
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, "认证模块未启用");
        }
    }

    private record RefreshSession(Long sessionId,
                                  String clientId,
                                  String deviceId,
                                  String tenantId,
                                  String refreshToken,
                                  String status,
                                  LocalDateTime expiresAt,
                                  LocalDateTime createdAt) {

        RefreshSession revoked() {
            return new RefreshSession(sessionId, clientId, deviceId, tenantId, null, SESSION_REVOKED,
                    expiresAt, createdAt);
        }
    }
}
