package dev.hucoo.modelgovernance.client;

import static org.junit.jupiter.api.Assertions.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

@SpringBootTest(classes = PublicModelCatalogFeignClientTest.Application.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {"spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
                "spring.application.name=public-catalog-client-test"})
@DirtiesContext
class PublicModelCatalogFeignClientTest {
    static final Map<String, String> incoming = new ConcurrentHashMap<>();
    static final HttpServer server = start();
    @Autowired PublicModelCatalogFeignClient client;

    @DynamicPropertySource static void endpoint(DynamicPropertyRegistry properties) {
        properties.add("agent-platform.clients.model-governance.base-url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
    }
    @AfterAll static void stop() { server.stop(0); }

    @Test void usesSharedPathDecodesGroupedResultAndPropagatesAuthentication() {
        RequestContextHolder.setRequestAttributes(new HeaderRequest(Map.of("Authorization", "Bearer client-token", "X-Tenant-Id", "tenant-a")));
        try {
            var result = client.catalog(7L);
            assertEquals(200, result.getCode());
            assertEquals("stable-v1", result.getData().policyVersion());
            assertEquals("catalog-1", result.getData().catalogVersion());
            var model = result.getData().providers().getFirst().models().getFirst();
            assertEquals("model", model.modelCode()); assertEquals("v1", model.versionCode());
            assertEquals(List.of("STREAMING"), model.capabilities());
            assertEquals("projectId=7", incoming.get("query"));
            assertEquals("Bearer client-token", incoming.get("authorization"));
            assertEquals("tenant-a", incoming.get("tenant"));
            client.catalog(null);
            assertEquals("", incoming.get("query"));
        } finally { RequestContextHolder.resetRequestAttributes(); }
    }

    private static HttpServer start() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext(PublicModelCatalogApi.PATH, exchange -> {
                incoming.put("query", exchange.getRequestURI().getQuery() == null ? "" : exchange.getRequestURI().getQuery());
                incoming.put("authorization", exchange.getRequestHeaders().getFirst("Authorization"));
                incoming.put("tenant", exchange.getRequestHeaders().getFirst("X-Tenant-Id"));
                byte[] response = """
                        {"code":200,"message":"success","timestamp":1791360000000,"data":{"catalogVersion":"catalog-1","policyVersion":"stable-v1",
                        "providers":[{"providerCode":"vendor","providerName":"Vendor","models":[{"modelCode":"model",
                        "modelName":"Model","modelType":"CHAT","versionCode":"v1","contextWindow":8192,
                        "inputModalities":["text"],"outputModalities":["text"],"capabilities":["STREAMING"]}]}]}}
                        """.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json"); exchange.sendResponseHeaders(200, response.length);
                try (var body = exchange.getResponseBody()) { body.write(response); }
            });
            server.start(); return server;
        } catch (java.io.IOException error) { throw new java.io.UncheckedIOException(error); }
    }

    private record HeaderRequest(Map<String, String> headers) implements RequestAttributes {
        public String getHeader(String name) { return headers.get(name); }
        public Object getAttribute(String name, int scope) { return null; }
        public void setAttribute(String name, Object value, int scope) { }
        public void removeAttribute(String name, int scope) { }
        public String[] getAttributeNames(int scope) { return new String[0]; }
        public void registerDestructionCallback(String name, Runnable callback, int scope) { }
        public Object resolveReference(String key) { return REFERENCE_REQUEST.equals(key) ? this : null; }
        public String getSessionId() { return "test"; }
        public Object getSessionMutex() { return this; }
    }
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableFeignClients(basePackageClasses = PublicModelCatalogFeignClient.class)
    static class Application { }
}
