package dev.hucoo.modelruntime.infrastructure.adapter;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import dev.hucoo.modelruntime.config.ModelRuntimeProperties;
import dev.hucoo.modelruntime.domain.AccountStatus;
import dev.hucoo.modelruntime.domain.CircuitState;
import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import reactor.core.publisher.Mono;

class OpenCodeGoAdapterTest {

    @Test
    void genericOpenAiCompatibleAdapterDoesNotSendOpenCodeHeaders() {
        List<HttpHeaders> requests = new ArrayList<>();
        OpenAiCompatibleAdapter adapter = new OpenAiCompatibleAdapter(recordingClient(requests));

        assertEquals("{}", adapter.invoke(request(), account(), "secret").block());

        HttpHeaders headers = requests.getFirst();
        assertEquals("Bearer secret", headers.getFirst(HttpHeaders.AUTHORIZATION));
        assertNull(headers.getFirst("x-opencode-session"));
        assertNull(headers.getFirst(HttpHeaders.USER_AGENT));
    }

    @Test
    void openCodeGoAdapterAddsProviderSpecificHeadersForBothModes() {
        List<HttpHeaders> requests = new ArrayList<>();
        ModelRuntimeProperties properties = new ModelRuntimeProperties();
        properties.setOpenCodeGoUserAgent("hucoo-test/1.0");
        OpenAiCompatibleAdapter delegate = new OpenAiCompatibleAdapter(recordingClient(requests));
        OpenCodeGoAdapter adapter = new OpenCodeGoAdapter(delegate, properties);

        assertEquals("{}", adapter.invoke(request(), account(), "secret").block());
        assertEquals(List.of("chunk"), adapter.stream(request(), account(), "secret").collectList().block());

        assertEquals(2, requests.size());
        String firstSession = assertProviderHeaders(requests.get(0));
        String secondSession = assertProviderHeaders(requests.get(1));
        assertNotEquals(firstSession, secondSession);
        assertDoesNotThrow(() -> UUID.fromString(firstSession));
        assertDoesNotThrow(() -> UUID.fromString(secondSession));
    }

    @Test
    void invalidUserAgentConfigurationIsRejectedBeforeSendingRequest() {
        List<HttpHeaders> requests = new ArrayList<>();
        ModelRuntimeProperties properties = new ModelRuntimeProperties();
        properties.setOpenCodeGoUserAgent("bad\nagent");
        OpenCodeGoAdapter adapter = new OpenCodeGoAdapter(
                new OpenAiCompatibleAdapter(recordingClient(requests)), properties);

        var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> adapter.invoke(request(), account(), "secret").block());
        assertEquals("OpenCode Go User-Agent 配置无效", error.getMessage());
        assertEquals(0, requests.size());
    }

    private String assertProviderHeaders(HttpHeaders headers) {
        assertEquals("Bearer secret", headers.getFirst(HttpHeaders.AUTHORIZATION));
        assertEquals("hucoo-test/1.0", headers.getFirst(HttpHeaders.USER_AGENT));
        String session = headers.getFirst("x-opencode-session");
        assertNotNull(session);
        return session;
    }

    private WebClient.Builder recordingClient(List<HttpHeaders> requests) {
        return WebClient.builder().exchangeFunction(request -> {
            HttpHeaders headers = new HttpHeaders();
            headers.putAll(request.headers());
            requests.add(headers);
            String body = request.headers().getFirst(HttpHeaders.ACCEPT) != null
                    && request.headers().getFirst(HttpHeaders.ACCEPT).contains(MediaType.TEXT_EVENT_STREAM_VALUE)
                    ? "chunk" : "{}";
            return Mono.just(ClientResponse.create(HttpStatus.OK)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .build());
        });
    }

    private ProviderRequest request() {
        return new ProviderRequest("model", List.of(), false, null, null, null);
    }

    private ModelAccessAccount account() {
        return ModelAccessAccount.builder()
                .id(1L)
                .providerCode("opencode-go")
                .modelCode("model")
                .endpoint("https://example.com/v1")
                .authenticationRequired(true)
                .status(AccountStatus.ACTIVE)
                .circuitState(CircuitState.CLOSED)
                .healthScore(1.0)
                .configuredWeight(1)
                .build();
    }
}
