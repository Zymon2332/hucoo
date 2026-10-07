package dev.hucoo.gateway;

import static org.junit.jupiter.api.Assertions.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.cloud.gateway.config.GatewayProperties;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
        "spring.main.web-application-type=reactive", "spring.config.import=",
        "spring.cloud.nacos.discovery.enabled=false", "spring.cloud.nacos.config.enabled=false",
        "agent-platform.gateway.auth.enabled=true"})
@DirtiesContext
@Import(GatewayPublicModelCatalogTests.LocalDestination.class)
class GatewayPublicModelCatalogTests {
    private static final DisposableServer downstream = HttpServer.create().host("127.0.0.1").port(0)
            .handle((request, response) -> response.sendString(Mono.just(request.uri() + "|"
                    + request.requestHeaders().get("Authorization")))).bindNow();
    @LocalServerPort int port;

    @TestConfiguration(proxyBeanMethods = false)
    static class LocalDestination {
        @Bean static BeanPostProcessor localRouteDestinations() {
            return new BeanPostProcessor() {
                @Override public Object postProcessBeforeInitialization(Object bean, String name) {
                    // 使用 application.yml 的实际路径和过滤器配置，仅覆盖服务目的地。
                    if (bean instanceof GatewayProperties properties) {
                        properties.getRoutes().forEach(route -> route.setUri(
                                URI.create("http://127.0.0.1:" + downstream.port())));
                    }
                    return bean;
                }
            };
        }
    }
    @AfterAll static void stop() { downstream.disposeNow(); }

    @Test void catalogRoutePreservesPathQueryAndAuthentication() throws Exception {
        var response = request("/api/v1/model-catalog?projectId=7", true);
        assertEquals(200, response.statusCode());
        assertEquals("/api/v1/model-catalog?projectId=7|Bearer client-token", response.body());
        assertEquals(401, request("/api/v1/model-catalog", false).statusCode());
    }

    @Test void existingServiceRoutesKeepTheirStripPrefixBehavior() throws Exception {
        for (String path : new String[]{"/api/admin/v1/probe", "/api/model/v1/probe", "/api/agent/v1/probe"}) {
            assertEquals("/v1/probe|Bearer client-token", request(path, true).body());
        }
    }

    private HttpResponse<String> request(String path, boolean authenticated) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (authenticated) builder.header("Authorization", "Bearer client-token");
        return HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
