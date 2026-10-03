package dev.hucoo.modelruntime.infrastructure.adapter;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** DeepSeek currently uses the OpenAI-compatible chat contract. */
@Component
@Order(-10)
public class DeepSeekModelProviderAdapter implements ModelProviderAdapter {
    private final OpenAiCompatibleAdapter delegate;
    public DeepSeekModelProviderAdapter(OpenAiCompatibleAdapter delegate) { this.delegate = delegate; }
    @Override public boolean supports(String providerCode) { return "deepseek".equalsIgnoreCase(providerCode); }
    @Override public Mono<String> invoke(ProviderRequest request, ModelAccessAccount account, String secret) { return delegate.invoke(request, account, secret); }
    @Override public Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret) { return delegate.stream(request, account, secret); }
}
