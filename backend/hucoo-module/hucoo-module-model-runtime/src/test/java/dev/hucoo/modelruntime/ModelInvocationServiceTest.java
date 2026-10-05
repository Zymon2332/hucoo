package dev.hucoo.modelruntime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import dev.hucoo.modelruntime.api.dto.AccountCreateRequest;
import dev.hucoo.modelruntime.api.dto.ChatCompletionRequest;
import dev.hucoo.modelruntime.api.dto.ChatMessage;
import dev.hucoo.modelruntime.application.service.ModelInvocationService;
import dev.hucoo.modelruntime.config.ModelRuntimeProperties;
import dev.hucoo.modelruntime.domain.FailureClass;
import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import dev.hucoo.modelruntime.infrastructure.adapter.ModelProviderAdapter;
import dev.hucoo.modelruntime.infrastructure.adapter.ProviderFailure;
import dev.hucoo.modelruntime.infrastructure.adapter.ProviderRequest;
import dev.hucoo.modelruntime.infrastructure.secret.InMemorySecretStore;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

class ModelInvocationServiceTest {
    @Test
    void retriesAnotherAccountWhenProviderRateLimits() {
        AtomicInteger calls = new AtomicInteger();
        ModelProviderAdapter adapter = new ModelProviderAdapter() {
            @Override public boolean supports(String providerCode) { return "deepseek".equals(providerCode); }
            @Override public Mono<String> invoke(ProviderRequest request, ModelAccessAccount account, String secret) {
                if (calls.getAndIncrement() == 0) return Mono.error(new ProviderFailure(FailureClass.RATE_LIMITED, 429, "limited"));
                return Mono.just("{\"id\":\"ok\"}");
            }
            @Override public Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret) { return Flux.just("data: ok"); }
        };
        ModelRuntimeProperties properties = new ModelRuntimeProperties();
        properties.setMaxAttempts(2);
        ModelInvocationService service = new ModelInvocationService(new InMemorySecretStore(), List.of(adapter), properties);
        service.createAccount(account("one", 1));
        service.createAccount(account("two", 1));

        ChatCompletionRequest request = new ChatCompletionRequest();
        request.setModel("deepseek-chat");
        ChatMessage message = new ChatMessage();
        message.setRole("user");
        message.setContent("hello");
        request.setMessages(List.of(message));

        assertEquals("{\"id\":\"ok\"}", service.invoke(request).block(Duration.ofSeconds(2)));
        assertEquals(2, calls.get());
        assertNotNull(service.preview("deepseek-chat"));
    }

    @Test
    void differentModelsCannotOverwriteEachOthersAccounts() {
        ModelInvocationService service = new ModelInvocationService(new InMemorySecretStore(), List.of(), new ModelRuntimeProperties());
        AccountCreateRequest first = account("first", 1);
        AccountCreateRequest second = account("second", 1);
        second.setModelCode("another-model");
        var a = service.createAccount(first);
        var b = service.createAccount(second);
        org.junit.jupiter.api.Assertions.assertNotEquals(a.getId(), b.getId());
        assertEquals(1, service.accounts("deepseek-chat").size());
        assertEquals(1, service.accounts("another-model").size());
    }

    private AccountCreateRequest account(String name, int weight) {
        AccountCreateRequest request = new AccountCreateRequest();
        request.setProviderCode("deepseek");
        request.setModelCode("deepseek-chat");
        request.setAccountName(name);
        request.setEndpoint("http://127.0.0.1:9999");
        request.setApiKey("sk-" + name);
        request.setConfiguredWeight(weight);
        return request;
    }
}
