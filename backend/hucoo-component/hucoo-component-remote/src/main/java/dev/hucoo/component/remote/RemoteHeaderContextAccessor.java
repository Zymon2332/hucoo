package dev.hucoo.component.remote;

import java.util.Map;

import io.micrometer.context.ThreadLocalAccessor;

/** Captures only HTTP header values, without retaining the request across executor threads. */
public final class RemoteHeaderContextAccessor implements ThreadLocalAccessor<Map<String, String>> {

    private static final ThreadLocal<Map<String, String>> HEADERS = new ThreadLocal<>();

    static Map<String, String> currentHeaders() {
        Map<String, String> headers = HEADERS.get();
        return headers == null ? Map.of() : headers;
    }

    @Override
    public Object key() {
        return "hucoo.remote.headers";
    }

    @Override
    public Map<String, String> getValue() {
        Map<String, String> headers = RemoteFeignHeaderInterceptor.headers();
        return headers.isEmpty() ? null : headers;
    }

    @Override
    public void setValue(Map<String, String> value) {
        HEADERS.set(Map.copyOf(value));
    }

    @Override
    public void setValue() {
        HEADERS.remove();
    }
}
