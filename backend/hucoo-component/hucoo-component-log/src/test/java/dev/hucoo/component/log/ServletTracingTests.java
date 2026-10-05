package dev.hucoo.component.log;

import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.DeferredResult;
import org.springframework.web.reactive.function.client.WebClient;
import dev.hucoo.component.log.context.TaskContext;
import tools.jackson.databind.json.JsonMapper;

@org.springframework.test.annotation.DirtiesContext
@SpringBootTest(classes = LoggingTestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"spring.application.name=servlet-test", "spring.main.web-application-type=servlet"})
@AutoConfigureTracing
@Import(ServletTracingTests.Endpoints.class)
class ServletTracingTests {
    static final String TRACE = "0123456789abcdef0123456789abcdef";
    @LocalServerPort int port;
    @Autowired WebClient.Builder webClient;
    @Autowired TaskContext context;
    @Test void responseAndControllerShareRealTraceAndIgnoreLegacyHeader() throws Exception {
        var response = send("/probe", "00-" + TRACE + "-0123456789abcdef-01");
        var body = new JsonMapper().readTree(response.body());
        assertThat(body.get("traceId").asText()).isEqualTo(TRACE);
        assertThat(body.get("spanId").asText()).hasSize(16).isNotEqualTo("0123456789abcdef");
        assertThat(response.headers().firstValue("X-Trace-Id")).contains(TRACE);
        var invalid = send("/probe", "invalid");
        assertThat(new JsonMapper().readTree(invalid.body()).get("traceId").asText()).hasSize(32).isNotEqualTo("legacy-input");
        assertThat(MDC.get("traceId")).isNull();
    }
    @Test void mvcCallableAndDeferredResultReuseRequestTrace() throws Exception {
        for (String path : new String[]{"/callable", "/deferred"}) {
            var response = send(path, "00-" + TRACE + "-0123456789abcdef-01");
            assertThat(new JsonMapper().readTree(response.body()).get("traceId").asText()).isEqualTo(TRACE);
            assertThat(response.headers().firstValue("X-Trace-Id")).contains(TRACE);
        }
    }
    @Test void webClientInjectsW3cAndCreatesClientAndServerSpans() throws Exception {
        var response = send("/forward", "00-" + TRACE + "-0123456789abcdef-01");
        var body = new JsonMapper().readTree(response.body());
        assertThat(body.get("traceId").asText()).isEqualTo(TRACE);
        assertThat(body.get("incoming").asText()).startsWith("00-" + TRACE + "-");
        assertThat(body.get("spanId").asText()).isNotEqualTo(body.get("incoming").asText().split("-")[2]);
    }
    @Test void exceptionsKeepTraceResponseHeader() throws Exception {
        assertThat(send("/failure", "00-" + TRACE + "-0123456789abcdef-01").headers().firstValue("X-Trace-Id")).contains(TRACE);
    }
    private HttpResponse<String> send(String path, String traceparent) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("traceparent", traceparent).header("X-Trace-Id", "legacy-input").build(), HttpResponse.BodyHandlers.ofString());
    }
    @TestConfiguration(proxyBeanMethods = false)
    static class Endpoints {
        @Bean ProbeController probeController(WebClient.Builder builder, TaskContext context) { return new ProbeController(builder, context); }
    }
    @RestController
    static class ProbeController {
        final WebClient.Builder builder;
        final TaskContext context;
        ProbeController(WebClient.Builder builder, TaskContext context) { this.builder = builder; this.context = context; }
        @GetMapping("/probe") Map<String, String> probe() { return Map.of("traceId", MDC.get("traceId"), "spanId", MDC.get("spanId")); }
        @GetMapping("/callable") Callable<Map<String, String>> callable() { return this::probe; }
        @GetMapping("/deferred") DeferredResult<Map<String, String>> deferred() {
            var result = new DeferredResult<Map<String, String>>();
            CompletableFuture.runAsync(context.wrap(() -> result.setResult(probe())));
            return result;
        }
        @GetMapping("/failure") String failure() { throw new IllegalStateException("expected-test-failure"); }
        @GetMapping("/downstream") Map<String, String> downstream(@org.springframework.web.bind.annotation.RequestHeader("traceparent") String incoming) {
            return Map.of("traceId", MDC.get("traceId"), "spanId", MDC.get("spanId"), "incoming", incoming);
        }
        @GetMapping("/forward") Map<?, ?> forward(jakarta.servlet.http.HttpServletRequest request) {
            return builder.clone().build().get().uri("http://localhost:" + request.getLocalPort() + "/downstream")
                    .retrieve().bodyToMono(Map.class).block();
        }
    }
}
