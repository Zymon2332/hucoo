package dev.hucoo.component.remote;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.MDC;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.RequestAttributes;

import dev.hucoo.commons.api.PlatformConstants;

import feign.RequestInterceptor;
import feign.RequestTemplate;

/** Propagates platform request context to internal HTTP calls. */
public class RemoteFeignHeaderInterceptor implements RequestInterceptor {

    private static final List<String> PROPAGATED_HEADERS = List.of(
            PlatformConstants.AUTHORIZATION_HEADER,
            PlatformConstants.TENANT_ID_HEADER,
            PlatformConstants.USER_ID_HEADER,
            PlatformConstants.USER_NAME_HEADER,
            PlatformConstants.TRACE_ID_HEADER,
            PlatformConstants.REQUEST_ID_HEADER,
            PlatformConstants.IDEMPOTENCY_KEY_HEADER);

    @Override
    public void apply(RequestTemplate template) {
        headers().forEach((header, value) -> {
            if (template.headers().get(header) == null) {
                template.header(header, value);
            }
        });

        if (template.headers().get(PlatformConstants.TRACE_ID_HEADER) == null) {
            String traceId = MDC.get(PlatformConstants.TRACE_ID_MDC_KEY);
            if (traceId != null && !traceId.isBlank()) {
                template.header(PlatformConstants.TRACE_ID_HEADER, traceId);
            }
        }
    }

    static Map<String, String> headers() {
        Map<String, String> headers = new LinkedHashMap<>(RemoteHeaderContextAccessor.currentHeaders());
        Object request = currentRequest();
        if (request != null) {
            for (String header : PROPAGATED_HEADERS) {
                String value = requestHeader(request, header);
                if (value != null && !value.isBlank()) {
                    headers.put(header, value);
                }
            }
        }

        return Map.copyOf(headers);
    }

    private static Object currentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        return attributes == null ? null : attributes.resolveReference(RequestAttributes.REFERENCE_REQUEST);
    }

    private static String requestHeader(Object request, String header) {
        try {
            var type = request.getClass();
            java.lang.reflect.Method method;
            try {
                method = type.getMethod("getHeader", String.class);
            } catch (NoSuchMethodException ignored) {
                method = type.getDeclaredMethod("getHeader", String.class);
            }
            // RequestContextHolder may expose a package/private proxy in tests or
            // application adapters. Make the reflective bridge usable for those
            // implementations while keeping this component servlet-free.
            if (!method.canAccess(request)) {
                if (!method.trySetAccessible()) {
                    return null;
                }
            }
            Object value = method.invoke(request, header);
            return value instanceof String stringValue ? stringValue : null;
        } catch (ReflectiveOperationException | RuntimeException ignored) {
            // The shared component also runs in WebFlux applications where the request
            // object does not expose the Servlet getHeader contract.
            return null;
        }
    }
}
