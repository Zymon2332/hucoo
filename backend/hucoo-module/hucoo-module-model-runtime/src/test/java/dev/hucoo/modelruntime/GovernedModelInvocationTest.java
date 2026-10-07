package dev.hucoo.modelruntime;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import dev.hucoo.component.security.context.*;
import dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade;
import dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade.Route;
import dev.hucoo.modelruntime.api.dto.*;
import dev.hucoo.modelruntime.application.service.ModelInvocationService;
import dev.hucoo.modelruntime.config.ModelRuntimeProperties;
import dev.hucoo.modelruntime.domain.*;
import dev.hucoo.modelruntime.infrastructure.adapter.*;
import dev.hucoo.modelruntime.infrastructure.secret.InMemorySecretStore;
import reactor.core.publisher.*;

class GovernedModelInvocationTest {
    @AfterEach void cleanup() { CurrentUserContext.clear(); }
    private final Duration timeout = Duration.ofSeconds(3);
    private ChatCompletionRequest request() {
        var request = new ChatCompletionRequest(); request.setModel("public-model"); request.setProjectId(7L);
        request.setMessages(List.of(new ChatMessage())); return request;
    }
    private ModelRuntimeProperties properties() {
        var properties = new ModelRuntimeProperties(); properties.setPersistenceEnabled(true); return properties;
    }
    private void login() { CurrentUserContext.set(new CurrentUser(42L, "client", "tenant-a", Set.of())); }
    private Route route(long id, String fingerprint) {
        return new Route("000000", id, "public-model", "upstream-model", "openai-compatible", "https://example.com/v1",
                1, 0, 1, true, fingerprint, () -> "test-key");
    }

    @Test void capturesIdentityBeforeAsyncSubscriptionAndKeepsSessionAcrossRetry() {
        var calls = new AtomicInteger(); var seen = new ArrayList<ProviderRequest>();
        var adapter = new ModelProviderAdapter() {
            public boolean supports(String provider) { return true; }
            public Mono<String> invoke(ProviderRequest request, ModelAccessAccount account, String secret) {
                seen.add(request); assertEquals("test-key", secret);
                return calls.getAndIncrement() == 0 ? Mono.error(new ProviderFailure(FailureClass.RATE_LIMITED, 429, "limited"))
                        : Mono.just("{\"id\":\"ok\"}");
            }
            public Flux<String> stream(ProviderRequest request, ModelAccessAccount account, String secret) { return Flux.empty(); }
        };
        ModelInvocationConfigurationFacade source = context -> {
            assertEquals("tenant-a", context.tenantId()); assertEquals(42L, context.userId()); assertEquals(7L, context.projectId());
            return List.of(route(1, "v1"), route(2, "v1"));
        };
        login();
        var service = new ModelInvocationService(new InMemorySecretStore(), List.of(adapter), properties(), source);
        var invocation = service.invoke(request()); CurrentUserContext.clear();
        assertEquals("{\"id\":\"ok\"}", invocation.block(timeout));
        assertEquals(2, calls.get());
        assertTrue(seen.stream().allMatch(r -> r.model().equals("upstream-model")));
    }

    @Test void rereadsGovernanceEachTimeAndFailsClosedWithoutIdentityOrBridge() {
        var reads = new AtomicInteger();
        ModelInvocationConfigurationFacade source = context -> { reads.incrementAndGet(); return List.of(); };
        var service = new ModelInvocationService(new InMemorySecretStore(), List.of(), properties(), source);
        assertThrows(dev.hucoo.commons.exception.BusinessException.class, () -> service.invoke(request()).block(timeout));
        assertEquals(0, reads.get()); login();
        assertThrows(dev.hucoo.commons.exception.BusinessException.class, () -> service.invoke(request()).block(timeout));
        assertThrows(dev.hucoo.commons.exception.BusinessException.class, () -> service.invoke(request()).block(timeout));
        assertEquals(2, reads.get());
        var disconnected = new ModelInvocationService(new InMemorySecretStore(), List.of(), properties());
        assertThrows(dev.hucoo.commons.exception.BusinessException.class, () -> disconnected.invoke(request()).block(timeout));
    }

    @Test void streamCancellationReleasesSharedConcurrencyAndRotationRecoversQuarantine() {
        var account = new AtomicReference<ModelAccessAccount>(); var fingerprint = new AtomicReference<>("v1");
        var adapter = new ModelProviderAdapter() {
            public boolean supports(String provider) { return true; }
            public Mono<String> invoke(ProviderRequest request, ModelAccessAccount selected, String secret) {
                account.set(selected);
                return "v1".equals(fingerprint.get()) ? Mono.error(new ProviderFailure(FailureClass.AUTHENTICATION, 401, "unauthorized"))
                        : Mono.just("ok");
            }
            public Flux<String> stream(ProviderRequest request, ModelAccessAccount selected, String secret) {
                account.set(selected); return Flux.just("chunk").concatWith(Flux.never());
            }
        };
        var service = new ModelInvocationService(new InMemorySecretStore(), List.of(adapter), properties(), c -> List.of(route(1, fingerprint.get())));
        login(); assertEquals("chunk", service.stream(request()).next().block(timeout));
        assertEquals(0, account.get().getInFlight().get());
        assertThrows(ProviderFailure.class, () -> service.invoke(request()).block(timeout));
        fingerprint.set("v2");
        assertEquals("ok", service.invoke(request()).block(timeout));
        assertEquals(0, account.get().getInFlight().get());
    }
}
