package dev.hucoo.runtime;

import static org.assertj.core.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=", "management.health.redis.enabled=false"})
@DirtiesContext
class ModelRuntimeLoggingTests {
    @LocalServerPort int port;
    @Test void runtimeServiceStartsAndReturnsStandardTraceHeader() throws Exception {
        String trace = "0123456789abcdef0123456789abcdef";
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://localhost:" + port + "/actuator/health"))
                .header("traceparent", "00-" + trace + "-0123456789abcdef-01").build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("X-Trace-Id")).contains(trace);
    }
}
