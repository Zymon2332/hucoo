package dev.hucoo.audit.infrastructure;

import java.util.Map;

import org.slf4j.MDC;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import dev.hucoo.audit.api.OperationLogEvent;
import dev.hucoo.audit.api.OperationLogPublisher;
import dev.hucoo.audit.config.OperationLogProperties;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class OperationLogInterceptor implements HandlerInterceptor {

    private static final String CONTEXT_ATTRIBUTE = OperationLogInterceptor.class.getName() + ".context";
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final OperationLogProperties properties;
    private final OperationLogPublisher publisher;

    public OperationLogInterceptor(OperationLogProperties properties, OperationLogPublisher publisher) {
        this.properties = properties;
        this.publisher = publisher;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod) || !shouldCapture(request)) {
            return true;
        }
        String requestUri = request.getRequestURI();
        Object matchingPattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String route = matchingPattern instanceof String pattern ? pattern : "";
        String action = resolveAction(handlerMethod, request.getMethod(), route);
        String resourceType = handlerMethod.getBeanType().getSimpleName().replace("Controller", "");
        String resourceId = resolveResourceId(request);
        request.setAttribute(CONTEXT_ATTRIBUTE, new RequestContext(
                System.currentTimeMillis(), request.getMethod(), requestUri, action, resourceType, resourceId));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception exception) {
        if (!(request.getAttribute(CONTEXT_ATTRIBUTE) instanceof RequestContext context)) {
            return;
        }
        CurrentUser user = request.getAttribute(PlatformConstants.CURRENT_USER_REQUEST_ATTRIBUTE) instanceof CurrentUser currentUser
                ? currentUser
                : CurrentUserContext.get();
        String tenantId = String.valueOf(request.getAttribute(
                PlatformConstants.CURRENT_TENANT_REQUEST_ATTRIBUTE) == null
                ? user == null ? PlatformConstants.SYSTEM_TENANT_ID : user.tenantId()
                : request.getAttribute(PlatformConstants.CURRENT_TENANT_REQUEST_ATTRIBUTE));
        int status = response.getStatus();
        if (exception != null && status < 400) {
            status = HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
        }
        int result = status >= 200 && status < 300 ? 1 : 0;
        publisher.publish(new OperationLogEvent(
                user == null ? null : user.userId(),
                user == null ? PlatformConstants.DEFAULT_OPERATOR : user.username(),
                tenantId,
                context.action(),
                context.resourceType(),
                context.resourceId(),
                result,
                request.getRemoteAddr(),
                resolveTraceId(request),
                context.requestMethod(),
                context.requestUri(),
                context.action(),
                status,
                Math.max(0L, System.currentTimeMillis() - context.startTime()),
                request.getHeader("User-Agent")));
    }

    private boolean shouldCapture(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (properties.getExcludedPaths().stream().anyMatch(pattern -> PATH_MATCHER.match(pattern, uri))) {
            return false;
        }
        return properties.isIncludeReadOperations()
                || switch (request.getMethod()) {
                    case "POST", "PUT", "PATCH", "DELETE" -> true;
                    default -> false;
                };
    }

    private String resolveAction(HandlerMethod handlerMethod, String method, String route) {
        RequirePermission permission = handlerMethod.getMethodAnnotation(RequirePermission.class);
        if (permission == null) {
            permission = handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
        }
        if (permission != null && permission.value().length > 0) {
            return permission.value()[0];
        }
        String methodName = handlerMethod.getMethod().getName();
        if (!methodName.isBlank()) {
            return methodName;
        }
        return route.isBlank() ? method : method + " " + route;
    }

    private String resolveResourceId(HttpServletRequest request) {
        Object raw = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(raw instanceof Map<?, ?> variables) || variables.isEmpty()) {
            return null;
        }
        Object id = variables.get("id");
        if (id == null) {
            id = variables.values().iterator().next();
        }
        return id == null ? null : String.valueOf(id);
    }

    private String resolveTraceId(HttpServletRequest request) {
        String traceId = MDC.get(PlatformConstants.TRACE_ID_MDC_KEY);
        return traceId == null ? request.getHeader(PlatformConstants.TRACE_ID_HEADER) : traceId;
    }

    private record RequestContext(long startTime,
                                  String requestMethod,
                                  String requestUri,
                                  String action,
                                  String resourceType,
                                  String resourceId) {
    }
}
