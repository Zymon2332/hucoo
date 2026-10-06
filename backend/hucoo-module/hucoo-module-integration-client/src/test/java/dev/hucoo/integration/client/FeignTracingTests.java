package dev.hucoo.integration.client;

import static org.assertj.core.api.Assertions.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import java.util.HashMap;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import io.micrometer.tracing.Tracer;
import com.sun.net.httpserver.HttpServer;

@SpringBootTest(classes = FeignTracingTests.Application.class, webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {"spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
                "spring.cloud.openfeign.circuitbreaker.enabled=true", "spring.application.name=feign-test"})
@DirtiesContext
class FeignTracingTests {
    static final Map<String, String> incoming = new ConcurrentHashMap<>();
    static final HttpServer server = startServer();
    @Autowired Tracer tracer;
    @Autowired GitProviderClient client;
    @DynamicPropertySource static void endpoint(DynamicPropertyRegistry properties) {
        properties.add("agent-platform.integration.git.base-url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
    }
    @AfterAll static void stop() { server.stop(0); }
    @Test void feignMaintainsTraceThroughCircuitBreakerExecutorAndInjectsClientSpan() {
        var span = tracer.nextSpan().name("feign-parent").start();
        var request = new HeaderRequestAttributes(Map.of(
                "Authorization", "Bearer test-token",
                "X-Tenant-Id", "tenant-a",
                "X-User-Id", "user-1"));
        RequestContextHolder.setRequestAttributes(request);
        try (var scope = tracer.withSpan(span)) {
            assertThat(client.getRepository("owner", "repo")).containsEntry("ok", true);
            assertThat(incoming.get("traceparent")).startsWith("00-" + span.context().traceId() + "-");
            assertThat(incoming.get("traceparent").split("-")[2]).isNotEqualTo(span.context().spanId());
            assertThat(tracer.currentSpan().context().spanId()).isEqualTo(span.context().spanId());
            assertThat(incoming.get("authorization")).isEqualTo("Bearer test-token");
            assertThat(incoming.get("tenant")).isEqualTo("tenant-a");
            assertThat(incoming.get("user")).isEqualTo("user-1");
        } finally { span.end(); RequestContextHolder.resetRequestAttributes(); }
    }
    private static final class HeaderRequestAttributes implements RequestAttributes {
        private final Map<String, String> headers;
        private HeaderRequestAttributes(Map<String, String> headers) { this.headers = new HashMap<>(headers); }
        public String getHeader(String name) { return headers.get(name); }
        @Override public Object getAttribute(String name, int scope) { return null; }
        @Override public void setAttribute(String name, Object value, int scope) { }
        @Override public void removeAttribute(String name, int scope) { }
        @Override public String[] getAttributeNames(int scope) { return new String[0]; }
        @Override public void registerDestructionCallback(String name, Runnable callback, int scope) { }
        @Override public Object resolveReference(String key) { return REFERENCE_REQUEST.equals(key) ? this : null; }
        @Override public String getSessionId() { return "test"; }
        @Override public Object getSessionMutex() { return this; }
    }
    private static HttpServer startServer() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/repos/owner/repo", exchange -> {
                String header = exchange.getRequestHeaders().getFirst("traceparent");
                incoming.put("traceparent", header == null ? "missing" : header);
                incoming.put("authorization", valueOrMissing(exchange.getRequestHeaders().getFirst("Authorization")));
                incoming.put("tenant", valueOrMissing(exchange.getRequestHeaders().getFirst("X-Tenant-Id")));
                incoming.put("user", valueOrMissing(exchange.getRequestHeaders().getFirst("X-User-Id")));
                byte[] response = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length);
                try (var stream = exchange.getResponseBody()) { stream.write(response); }
            });
            server.start(); return server;
        } catch (java.io.IOException ex) { throw new java.io.UncheckedIOException(ex); }
    }
    private static String valueOrMissing(String value) { return value == null ? "missing" : value; }
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableFeignClients(basePackageClasses = GitProviderClient.class)
    static class Application { }
}
