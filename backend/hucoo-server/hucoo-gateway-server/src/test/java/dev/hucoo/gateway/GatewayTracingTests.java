package dev.hucoo.gateway;

import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.test.annotation.DirtiesContext;
import reactor.netty.http.server.HttpServer;
import reactor.netty.DisposableServer;
import reactor.core.publisher.Mono;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import dev.hucoo.gateway.filter.AccessLogGlobalFilter;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
        "spring.main.web-application-type=reactive", "spring.config.import=",
        "spring.cloud.nacos.discovery.enabled=false", "spring.cloud.nacos.config.enabled=false",
        "agent-platform.gateway.auth.enabled=true"})
@Import(GatewayTracingTests.LocalRoute.class)
@DirtiesContext
class GatewayTracingTests {
    private static final String TRACE = "0123456789abcdef0123456789abcdef";
    private static final Map<String, String> SERVER_SPANS = new ConcurrentHashMap<>();
    @LocalServerPort int port;
    @Test void routesW3cTraceAndKeepsAccessLogContextAfterCompletion() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(AccessLogGlobalFilter.class);
        ListAppender<ILoggingEvent> logs = new ListAppender<>() {
            @Override protected void append(ILoggingEvent event) {
                event.prepareForDeferredProcessing();
                super.append(event);
            }
        };
        logs.list = new java.util.concurrent.CopyOnWriteArrayList<>();
        logs.start(); logger.addAppender(logs);
        try {
            var response = request(true);
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("X-Trace-Id")).contains(TRACE);
            String downstream = new JsonMapper().readTree(response.body()).get("traceparent").asText();
            assertThat(downstream).startsWith("00-" + TRACE + "-");
            assertThat(downstream.split("-")[2]).isNotEqualTo("0123456789abcdef").isNotEqualTo(SERVER_SPANS.get(TRACE));
            long deadline = System.nanoTime() + java.time.Duration.ofSeconds(2).toNanos();
            while (logs.list.isEmpty() && System.nanoTime() < deadline) Thread.sleep(5);
            assertThat(logs.list).anySatisfy(event -> assertThat(event.getMDCPropertyMap())
                    .containsEntry("traceId", TRACE).containsEntry("spanId", SERVER_SPANS.get(TRACE)));
        } finally { logger.detachAppender(logs); logs.stop(); }
    }
    @Test void unauthorizedResponseStillHasTraceHeaderAndResultTrace() throws Exception {
        var response = request(false);
        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers().firstValue("X-Trace-Id")).contains(TRACE);
        assertThat(new JsonMapper().readTree(response.body()).get("traceId").asText()).isEqualTo(TRACE);
    }
    private HttpResponse<String> request(boolean authenticated) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/logging/probe"))
                .header("traceparent", "00-" + TRACE + "-0123456789abcdef-01");
        if (authenticated) builder.header("Authorization", "Bearer demo");
        return HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
    @TestConfiguration(proxyBeanMethods = false)
    static class LocalRoute {
        @Bean(destroyMethod = "disposeNow") DisposableServer localDownstream() {
            return HttpServer.create().host("127.0.0.1").port(0).handle((request, response) ->
                    response.header("Content-Type", "application/json").sendString(Mono.just(
                            "{\"traceparent\":\"" + request.requestHeaders().get("traceparent") + "\"}"))).bindNow();
        }
        @Bean RouteLocator loggingTestRoute(RouteLocatorBuilder builder, DisposableServer downstream) {
            return builder.routes().route("logging-test", route -> route.path("/logging/**")
                    .uri("http://127.0.0.1:" + downstream.port())).build();
        }
        @Bean GlobalFilter captureGatewaySpan() {
            return (exchange, chain) -> Mono.deferContextual(context -> {
                SERVER_SPANS.put(MDC.get("traceId"), MDC.get("spanId"));
                return chain.filter(exchange);
            });
        }
    }
}
