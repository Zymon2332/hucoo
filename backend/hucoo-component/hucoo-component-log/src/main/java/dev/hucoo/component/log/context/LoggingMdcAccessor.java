package dev.hucoo.component.log.context;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.MDC;
import io.micrometer.context.ThreadLocalAccessor;

/**
 * Trace keys are exclusively managed by the tracer's scope decorator.
 */
public final class LoggingMdcAccessor implements ThreadLocalAccessor<Map<String, String>> {
    public static final String KEY = "hucoo.logging.mdc";

    @Override
    public Object key() {
        return KEY;
    }

    @Override
    public Map<String, String> getValue() {
        Map<String, String> values = MDC.getCopyOfContextMap();
        if (values == null) return Map.of();
        values.remove("traceId");
        values.remove("spanId");
        return values;
    }

    @Override
    public void setValue(Map<String, String> values) {
        Map<String, String> current = new HashMap<>();
        String traceId = MDC.get("traceId");
        String spanId = MDC.get("spanId");
        if (values != null) current.putAll(values);
        current.remove("traceId");
        current.remove("spanId");
        if (traceId != null) current.put("traceId", traceId);
        if (spanId != null) current.put("spanId", spanId);
        MDC.setContextMap(current);
    }

    @Override
    public void setValue() {
        setValue(Map.of());
    }
}
