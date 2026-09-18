package dev.hucoo.component.web.advice;

import java.lang.reflect.Method;

import org.slf4j.MDC;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;

@ControllerAdvice
public class ResponseWrapper implements ResponseBodyAdvice<Object> {

    private static final String SCANNED_PACKAGE_PREFIX = "dev.hucoo";

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        Method method = returnType.getMethod();
        Class<?> controllerClass = returnType.getContainingClass();
        if (method == null || controllerClass == null || !controllerClass.getName().startsWith(SCANNED_PACKAGE_PREFIX)) {
            return false;
        }
        Class<?> parameterType = returnType.getParameterType();
        if (void.class.equals(parameterType)
                || Void.class.equals(parameterType)
                || String.class.equals(parameterType)
                || byte[].class.equals(parameterType)
                || Resource.class.isAssignableFrom(parameterType)) {
            return false;
        }
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request,
                                  ServerHttpResponse response) {
        String traceId = MDC.get(PlatformConstants.TRACE_ID_MDC_KEY);
        if (body instanceof Result<?> result) {
            if (result.getTraceId() == null) {
                result.withTraceId(traceId);
            }
            return result;
        }
        return Result.ok(body).withTraceId(traceId);
    }
}
