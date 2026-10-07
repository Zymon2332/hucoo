package dev.hucoo.modelruntime.infrastructure.adapter;

import java.util.UUID;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

import dev.hucoo.modelruntime.config.ModelRuntimeProperties;
import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** OpenCode Go 的供应商专属协议适配器，复用 OpenAI Compatible 的请求体和响应解析。 */
@Component
@Order(-20)
public class OpenCodeGoAdapter implements ModelProviderAdapter {
    private final OpenAiCompatibleAdapter delegate;
    private final ModelRuntimeProperties properties;

    public OpenCodeGoAdapter(OpenAiCompatibleAdapter delegate, ModelRuntimeProperties properties) {
        this.delegate = delegate;
        this.properties = properties;
    }

    @Override
    public boolean supports(String providerCode) {
        return providerCode != null && (providerCode.equalsIgnoreCase("opencode-go")
                || providerCode.equalsIgnoreCase("opencode_go")
                || providerCode.equalsIgnoreCase("opencode"));
    }

    @Override
    public Mono<String> invoke(ProviderRequest request, ModelAccessAccount account, String secret) {
        return delegate.invokeWithHeaders(request, account, secret, this::addHeaders);
    }

    @Override
    public Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret) {
        return delegate.streamWithHeaders(request, account, secret, this::addHeaders);
    }

    private void addHeaders(HttpHeaders headers) {
        String userAgent = properties.getOpenCodeGoUserAgent();
        if (userAgent == null || userAgent.isBlank() || userAgent.contains("\r") || userAgent.contains("\n"))
            throw new IllegalStateException("OpenCode Go User-Agent 配置无效");
        headers.set(HttpHeaders.USER_AGENT, userAgent);
        headers.set("x-opencode-session", UUID.randomUUID().toString());
    }
}
