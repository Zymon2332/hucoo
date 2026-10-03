package dev.hucoo.component.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doReturn;
import static org.mockito.ArgumentMatchers.any;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.component.security.config.SecurityProperties;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.security.interceptor.PermissionInterceptor;
import dev.hucoo.component.security.interceptor.PermissionResolver;
import dev.hucoo.component.security.util.JwtUtil;

class PermissionInterceptorTest {

    private final SecurityProperties properties = properties();
    private final JwtUtil jwt = new JwtUtil(properties.getJwtSecret());

    @AfterEach
    void clearContexts() {
        CurrentUserContext.clear();
        CurrentTenantContext.clear();
    }

    @Test
    void rejectsCrossTenantHeaderForRegularUser() {
        PermissionResolver resolver = (user, permission) -> true;
        PermissionInterceptor interceptor = interceptor(resolver);
        MockHttpServletRequest request = request("tenant-a", "tenant-b", "tenant:update");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> interceptor.preHandle(request, new MockHttpServletResponse(), handler()));

        assertEquals(403, exception.getCode());
        assertEquals("tenant-a", CurrentTenantContext.getTenantId());
    }

    @Test
    void allowsPermissionResolverAndCleansTenantContext() throws Exception {
        PermissionInterceptor interceptor = interceptor((user, permission) -> "tenant:update".equals(permission));
        MockHttpServletRequest request = request("tenant-a", null, "tenant:update");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, handler()));
        assertEquals("tenant-a", CurrentTenantContext.getTenantId());
        interceptor.afterCompletion(request, response, handler(), null);
        assertEquals(PlatformConstants.SYSTEM_TENANT_ID, CurrentTenantContext.getTenantId());
    }

    @Test
    void rejectsMissingPermission() {
        PermissionInterceptor interceptor = interceptor((user, permission) -> false);
        BusinessException exception = assertThrows(BusinessException.class,
                () -> interceptor.preHandle(request("tenant-a", null, "tenant:update"),
                        new MockHttpServletResponse(), handler()));
        assertEquals(403, exception.getCode());
    }

    private PermissionInterceptor interceptor(PermissionResolver resolver) {
        ObjectProvider<PermissionResolver> provider = mock(ObjectProvider.class);
        doReturn(resolver).when(provider).getIfAvailable(any());
        return new PermissionInterceptor(properties, jwt, provider);
    }

    private MockHttpServletRequest request(String tenantId, String requestedTenant, String permission) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/v1/tenants/1");
        request.addHeader(PlatformConstants.AUTHORIZATION_HEADER, PlatformConstants.BEARER_PREFIX + token(tenantId, permission));
        if (requestedTenant != null) {
            request.addHeader(PlatformConstants.TENANT_ID_HEADER, requestedTenant);
        }
        return request;
    }

    private String token(String tenantId, String permission) {
        return jwt.createToken("user", Map.of("userId", 42L, "username", "tester", "tenantId", tenantId,
                "permissions", permission), Duration.ofMinutes(10));
    }

    private HandlerMethod handler() throws NoSuchMethodException {
        return new HandlerMethod(new TestController(), TestController.class.getMethod("write"));
    }

    private SecurityProperties properties() {
        SecurityProperties value = new SecurityProperties();
        value.setEnabled(true);
        value.setIgnoredPaths(java.util.List.of());
        return value;
    }

    static class TestController {
        @RequirePermission("tenant:update")
        public void write() {
        }
    }
}
