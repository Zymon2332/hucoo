package dev.hucoo.component.log;

import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import reactor.test.StepVerifier;
import io.micrometer.tracing.Tracer;
import dev.hucoo.component.log.context.TaskContext;
import tools.jackson.databind.json.JsonMapper;

@org.springframework.test.annotation.DirtiesContext
@SpringBootTest(classes = LoggingTestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"spring.application.name=reactive-test", "spring.main.web-application-type=reactive"})
@AutoConfigureTracing
@Import(ReactiveTracingTests.Endpoints.class)
class ReactiveTracingTests {
    @LocalServerPort int port;
    @Autowired Tracer tracer;
    @Autowired TaskContext tasks;
    @Test void concurrentRequestsKeepSeparateTraceAcrossSchedulerSwitches() throws Exception {
        var client = HttpClient.newHttpClient();
        String first = "11111111111111111111111111111111", second = "22222222222222222222222222222222";
        var a = send(client, first);
        var b = send(client, second);
        for (var pair : Map.of(first, a, second, b).entrySet()) {
            var response = pair.getValue().get(5, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("X-Trace-Id")).contains(pair.getKey());
            var body = new JsonMapper().readTree(response.body());
            assertThat(body.get("traceId").asText()).isEqualTo(pair.getKey());
            assertThat(body.get("spanId").asText()).hasSize(16);
        }
    }
    @Test void streamCancellationAndTimeoutRestoreSchedulerContext() throws Exception {
        var span = tracer.nextSpan().name("stream").start();
        try (var scope = tracer.withSpan(span)) {
            StepVerifier.create(Flux.interval(Duration.ofMillis(5)).map(value -> MDC.get("traceId")).contextCapture())
                    .expectNext(span.context().traceId()).thenCancel().verify(Duration.ofSeconds(2));
            StepVerifier.create(Mono.delay(Duration.ofSeconds(1)).timeout(Duration.ofMillis(10)).contextCapture())
                    .expectError(java.util.concurrent.TimeoutException.class).verify(Duration.ofSeconds(2));
        } finally { span.end(); }
        assertThat(MDC.get("traceId")).isNull();
        assertThat(Mono.fromCallable(() -> MDC.get("traceId")).subscribeOn(Schedulers.parallel()).block()).isNull();
    }
    private CompletableFuture<HttpResponse<String>> send(HttpClient client, String trace) {
        return client.sendAsync(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/reactive"))
                .header("traceparent", "00-" + trace + "-0123456789abcdef-01").build(), HttpResponse.BodyHandlers.ofString());
    }
    @TestConfiguration(proxyBeanMethods = false)
    static class Endpoints { @Bean ReactiveController reactiveController() { return new ReactiveController(); } }
    @RestController
    static class ReactiveController {
        @GetMapping("/reactive") Mono<Map<String, String>> reactive() {
            return Mono.delay(Duration.ofMillis(10)).publishOn(Schedulers.boundedElastic())
                    .map(value -> Map.of("traceId", MDC.get("traceId"), "spanId", MDC.get("spanId")));
        }
    }
}
