package dev.hucoo.modelruntime.infrastructure.adapter;

import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ModelProviderAdapter {
    boolean supports(String providerCode);
    Mono<String> invoke(ProviderRequest request, ModelAccessAccount account, String secret);
    Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret);
}
