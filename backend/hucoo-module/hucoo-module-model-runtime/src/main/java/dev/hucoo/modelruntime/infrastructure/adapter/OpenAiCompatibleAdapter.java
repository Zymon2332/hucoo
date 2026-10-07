package dev.hucoo.modelruntime.infrastructure.adapter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Consumer;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import dev.hucoo.modelruntime.domain.FailureClass;
import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class OpenAiCompatibleAdapter implements ModelProviderAdapter {
    private final WebClient.Builder clientBuilder;

    public OpenAiCompatibleAdapter(WebClient.Builder clientBuilder) {
        this.clientBuilder = clientBuilder;
    }

    @Override
    public boolean supports(String providerCode) {
        return providerCode != null && (providerCode.equalsIgnoreCase("deepseek")
                || providerCode.equalsIgnoreCase("openai")
                || providerCode.equalsIgnoreCase("openai-compatible"));
    }

    @Override
    public Mono<String> invoke(ProviderRequest request, ModelAccessAccount account, String secret) {
        return invokeWithHeaders(request, account, secret, ignored -> { });
    }

    @Override
    public Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret) {
        return streamWithHeaders(request, account, secret, ignored -> { });
    }

    Mono<String> invokeWithHeaders(ProviderRequest request, ModelAccessAccount account, String secret,
                                   Consumer<HttpHeaders> headersCustomizer) {
        return exchange(request, account, secret, false, headersCustomizer).collectList()
                .map(parts -> String.join("", parts));
    }

    Flux<String> streamWithHeaders(ProviderRequest request, ModelAccessAccount account, String secret,
                                   Consumer<HttpHeaders> headersCustomizer) {
        return exchange(request, account, secret, true, headersCustomizer);
    }

    private Flux<String> exchange(ProviderRequest request, ModelAccessAccount account,
                                  String secret, boolean stream,
                                  Consumer<HttpHeaders> headersCustomizer) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.model());
        body.put("messages", request.messages());
        body.put("stream", stream);
        if (request.temperature() != null) body.put("temperature", request.temperature());
        if (request.maxTokens() != null) body.put("max_tokens", request.maxTokens());
        if (request.extra() != null) request.extra().forEach((key, value) -> {
            if (java.util.Set.of("model", "messages", "stream", "temperature", "max_tokens").contains(key))
                throw new IllegalArgumentException("extra 不允许覆盖核心调用参数");
            body.put(key, value);
        });
        return clientBuilder.clone().baseUrl(account.getEndpoint()).build()
                .post().uri("/chat/completions")
                .headers(headers -> {
                    if (account.isAuthenticationRequired()) headers.setBearerAuth(secret);
                    headersCustomizer.accept(headers);
                })
                .contentType(MediaType.APPLICATION_JSON)
                .accept(stream ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .exchangeToFlux(response -> {
                    if (response.statusCode().is2xxSuccessful()) return response.bodyToFlux(String.class);
                    return response.bodyToMono(String.class).defaultIfEmpty("")
                            .flatMapMany(error -> Flux.error(classify(response.statusCode().value(), error)));
                });
    }

    private ProviderFailure classify(int status, String body) {
        FailureClass kind = switch (status) {
            case 401, 403 -> FailureClass.AUTHENTICATION;
            case 408 -> FailureClass.TIMEOUT;
            case 429 -> FailureClass.RATE_LIMITED;
            case 400, 404, 422 -> FailureClass.INVALID_REQUEST;
            default -> status >= 500 ? FailureClass.PROVIDER_5XX : FailureClass.UNKNOWN;
        };
        if (body != null && body.toLowerCase().contains("balance")) kind = FailureClass.INSUFFICIENT_BALANCE;
        return new ProviderFailure(kind, status, "provider returned " + status);
    }
}
