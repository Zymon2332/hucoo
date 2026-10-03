package dev.hucoo.modelruntime.infrastructure.adapter;

import java.util.LinkedHashMap;
import java.util.Map;

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
        return exchange(request, account, secret, false).collectList().map(parts -> String.join("", parts));
    }

    @Override
    public Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret) {
        return exchange(request, account, secret, true);
    }

    private Flux<String> exchange(ProviderRequest request, ModelAccessAccount account,
                                  String secret, boolean stream) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.model());
        body.put("messages", request.messages());
        body.put("stream", stream);
        if (request.temperature() != null) body.put("temperature", request.temperature());
        if (request.maxTokens() != null) body.put("max_tokens", request.maxTokens());
        if (request.extra() != null) body.putAll(request.extra());
        return clientBuilder.clone().baseUrl(account.getEndpoint()).build()
                .post().uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + secret)
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
