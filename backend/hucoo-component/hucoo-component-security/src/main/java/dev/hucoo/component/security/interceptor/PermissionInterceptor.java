package dev.hucoo.component.security.interceptor;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.AntPathMatcher;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.component.security.config.SecurityProperties;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.security.util.JwtUtil;
import dev.hucoo.component.database.tenant.CurrentTenantContext;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class PermissionInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(PermissionInterceptor.class);

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final SecurityProperties properties;
    private final JwtUtil jwtUtil;
    private final ObjectProvider<PermissionResolver> permissionResolver;

    public PermissionInterceptor(SecurityProperties properties,
                                 JwtUtil jwtUtil,
                                 ObjectProvider<PermissionResolver> permissionResolver) {
        this.properties = properties;
        this.jwtUtil = jwtUtil;
        this.permissionResolver = permissionResolver;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (isIgnored(request.getRequestURI())) {
            return true;
        }
        String token = resolveToken(request);
        if (token != null) {
            CurrentUser currentUser = toCurrentUser(jwtUtil.parse(token));
            CurrentUserContext.set(currentUser);
            CurrentTenantContext.set(currentUser.tenantId());
            assertTenantHeader(request, currentUser);
        }
        if (!properties.isEnabled()) {
            return true;
        }
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        RequirePermission requirePermission = handlerMethod.getMethodAnnotation(RequirePermission.class);
        if (requirePermission == null) {
            requirePermission = handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
        }
        if (requirePermission == null) {
            return true;
        }
        CurrentUser user = CurrentUserContext.get();
        if (user == null) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        }
        PermissionResolver resolver = permissionResolver.getIfAvailable(PermissionResolver::jwtClaimsOnly);
        for (String permission : requirePermission.value()) {
            if (!resolver.hasPermission(user, permission)) {
                log.warn("permission denied: user={}, required={}", user.username(), permission);
                throw new BusinessException(CommonErrorCode.FORBIDDEN, "缺少权限: " + permission);
            }
        }
        return true;
    }

    private void assertTenantHeader(HttpServletRequest request, CurrentUser user) {
        String requestedTenant = request.getHeader(PlatformConstants.TENANT_ID_HEADER);
        if (StringUtil.isBlank(requestedTenant) || requestedTenant.equals(user.tenantId())) {
            return;
        }
        if (PlatformConstants.SYSTEM_TENANT_ID.equals(user.tenantId()) && user.hasPermission("tenant:switch")) {
            CurrentTenantContext.set(requestedTenant);
            return;
        }
        throw new BusinessException(CommonErrorCode.FORBIDDEN, "不能访问其他租户数据");
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        CurrentUserContext.clear();
        CurrentTenantContext.clear();
    }

    private boolean isIgnored(String uri) {
        List<String> ignoredPaths = properties.getIgnoredPaths();
        return ignoredPaths != null && ignoredPaths.stream().anyMatch(pattern -> PATH_MATCHER.match(pattern, uri));
    }

    private String resolveToken(HttpServletRequest request) {
        String authorization = request.getHeader(PlatformConstants.AUTHORIZATION_HEADER);
        if (StringUtil.isBlank(authorization)) {
            return null;
        }
        if (authorization.startsWith(PlatformConstants.BEARER_PREFIX)) {
            return authorization.substring(PlatformConstants.BEARER_PREFIX.length()).trim();
        }
        return authorization.trim();
    }

    private CurrentUser toCurrentUser(Map<String, Object> claims) {
        Long userId = claims.get("userId") instanceof Number number ? number.longValue() : null;
        String username = String.valueOf(claims.getOrDefault("username", PlatformConstants.DEFAULT_OPERATOR));
        String tenantId = String.valueOf(claims.getOrDefault("tenantId", properties.getDefaultTenantId()));
        Set<String> permissions = parsePermissions(claims.get("permissions"));
        return new CurrentUser(userId, username, tenantId, permissions);
    }

    private Set<String> parsePermissions(Object raw) {
        if (raw instanceof String text) {
            return StringUtil.isBlank(text)
                    ? Set.of()
                    : Arrays.stream(text.split(",")).map(String::trim).collect(Collectors.toSet());
        }
        if (raw instanceof List<?> list) {
            return list.stream().map(String::valueOf).collect(Collectors.toSet());
        }
        return Set.of();
    }
}
