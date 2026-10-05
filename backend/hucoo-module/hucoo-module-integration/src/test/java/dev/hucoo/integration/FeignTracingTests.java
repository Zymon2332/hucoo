package dev.hucoo.integration;

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
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import dev.hucoo.integration.config.IntegrationAppModuleConfig;
import dev.hucoo.integration.infrastructure.client.GitProviderClient;
import dev.hucoo.integration.infrastructure.client.GitProviderClientFallbackFactory;
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
        try (var scope = tracer.withSpan(span)) {
            assertThat(client.getRepository("owner", "repo")).containsEntry("ok", true);
            assertThat(incoming.get("traceparent")).startsWith("00-" + span.context().traceId() + "-");
            assertThat(incoming.get("traceparent").split("-")[2]).isNotEqualTo(span.context().spanId());
            assertThat(tracer.currentSpan().context().spanId()).isEqualTo(span.context().spanId());
        } finally { span.end(); }
    }
    private static HttpServer startServer() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/repos/owner/repo", exchange -> {
                String header = exchange.getRequestHeaders().getFirst("traceparent");
                incoming.put("traceparent", header == null ? "missing" : header);
                byte[] response = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length);
                try (var stream = exchange.getResponseBody()) { stream.write(response); }
            });
            server.start(); return server;
        } catch (java.io.IOException ex) { throw new java.io.UncheckedIOException(ex); }
    }
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({IntegrationAppModuleConfig.class, GitProviderClientFallbackFactory.class})
    static class Application { }
}
