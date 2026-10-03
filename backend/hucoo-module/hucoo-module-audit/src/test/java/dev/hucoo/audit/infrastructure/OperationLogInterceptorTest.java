package dev.hucoo.audit.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;

import dev.hucoo.audit.api.OperationLogEvent;
import dev.hucoo.audit.api.OperationLogPublisher;
import dev.hucoo.audit.config.OperationLogProperties;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.component.security.context.CurrentUser;

class OperationLogInterceptorTest {

    @Test
    void capturesWriteOperationWithoutReadingPayload() throws Exception {
        List<OperationLogEvent> events = new ArrayList<>();
        OperationLogInterceptor interceptor = interceptor(events);
        MockHttpServletRequest request = request("POST", "/api/admin/v1/tenants/42");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/admin/v1/tenants/{id}");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of("id", "42"));
        request.setAttribute(PlatformConstants.CURRENT_USER_REQUEST_ATTRIBUTE,
                new CurrentUser(7L, "operator", "tenant-a", java.util.Set.of("tenant:update")));
        request.setAttribute(PlatformConstants.CURRENT_TENANT_REQUEST_ATTRIBUTE, "tenant-a");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(204);

        interceptor.preHandle(request, response, handler());
        interceptor.afterCompletion(request, response, handler(), null);

        OperationLogEvent event = events.getFirst();
        assertEquals("tenant:update", event.action());
        assertEquals("42", event.resourceId());
        assertEquals("tenant-a", event.tenantId());
        assertEquals("POST", event.requestMethod());
        assertEquals(204, event.httpStatus());
        assertEquals(1, event.result());
    }

    @Test
    void ignoresReadAndExcludedOperations() throws Exception {
        List<OperationLogEvent> events = new ArrayList<>();
        OperationLogInterceptor interceptor = interceptor(events);
        MockHttpServletResponse response = new MockHttpServletResponse();

        MockHttpServletRequest read = request("GET", "/api/admin/v1/tenants");
        interceptor.preHandle(read, response, handler());
        interceptor.afterCompletion(read, response, handler(), null);

        MockHttpServletRequest excluded = request("POST", "/api/admin/v1/audit-logs");
        interceptor.preHandle(excluded, response, handler());
        interceptor.afterCompletion(excluded, response, handler(), null);

        assertEquals(0, events.size());
    }

    @Test
    void recordsFailedRequestStatus() throws Exception {
        List<OperationLogEvent> events = new ArrayList<>();
        OperationLogInterceptor interceptor = interceptor(events);
        MockHttpServletRequest request = request("DELETE", "/api/admin/v1/tenants/42");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/admin/v1/tenants/{id}");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(500);

        interceptor.preHandle(request, response, handler());
        interceptor.afterCompletion(request, response, handler(), new IllegalStateException("failed"));

        OperationLogEvent event = events.getFirst();
        assertEquals(0, event.result());
        assertEquals(500, event.httpStatus());
        assertNull(event.operatorId());
        assertEquals(PlatformConstants.SYSTEM_TENANT_ID, event.tenantId());
    }

    private OperationLogInterceptor interceptor(List<OperationLogEvent> events) {
        OperationLogProperties properties = new OperationLogProperties();
        properties.setExcludedPaths(List.of("/api/admin/v1/audit-logs/**"));
        OperationLogPublisher publisher = events::add;
        return new OperationLogInterceptor(properties, publisher);
    }

    private MockHttpServletRequest request(String method, String uri) {
        return new MockHttpServletRequest(method, uri);
    }

    private HandlerMethod handler() throws NoSuchMethodException {
        return new HandlerMethod(new TestController(), TestController.class.getMethod("write", Long.class));
    }

    static class TestController {
        @RequirePermission("tenant:update")
        public void write(Long id) {
        }
    }
}
