package dev.hucoo.modelruntime.application.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Service;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.modelruntime.api.ModelRuntimeFacade;
import dev.hucoo.modelruntime.api.dto.AccountCreateRequest;
import dev.hucoo.modelruntime.api.dto.AccountDTO;
import dev.hucoo.modelruntime.api.dto.ChatCompletionRequest;
import dev.hucoo.modelruntime.api.dto.RoutePreviewDTO;
import dev.hucoo.modelruntime.api.dto.RotateAccountRequest;
import dev.hucoo.modelruntime.api.dto.BalanceUpdateRequest;
import dev.hucoo.modelruntime.config.ModelRuntimeProperties;
import dev.hucoo.modelruntime.domain.AccountStatus;
import dev.hucoo.modelruntime.domain.CircuitState;
import dev.hucoo.modelruntime.domain.FailureClass;
import dev.hucoo.modelruntime.domain.ModelAccessAccount;
import dev.hucoo.modelruntime.infrastructure.adapter.ModelProviderAdapter;
import dev.hucoo.modelruntime.infrastructure.adapter.ProviderFailure;
import dev.hucoo.modelruntime.infrastructure.adapter.ProviderRequest;
import dev.hucoo.modelruntime.infrastructure.secret.SecretStore;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ModelInvocationService implements ModelRuntimeFacade {
    private final Map<Long, ModelAccessAccount> accounts = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> sequence = new ConcurrentHashMap<>();
    private final SecretStore secretStore;
    private final List<ModelProviderAdapter> adapters;
    private final ModelRuntimeProperties properties;

    public ModelInvocationService(SecretStore secretStore, List<ModelProviderAdapter> adapters,
                                  ModelRuntimeProperties properties) {
        this.secretStore = secretStore;
        this.adapters = adapters;
        this.properties = properties;
    }

    public Mono<String> invoke(ChatCompletionRequest request) {
        return Mono.defer(() -> attempt(request, false, 0, List.of()));
    }

    public Flux<String> stream(ChatCompletionRequest request) {
        return Flux.defer(() -> {
            ModelAccessAccount account = select(request.getModel(), List.of());
            if (account == null) return Flux.error(routeFailed(request.getModel()));
            if (!account.tryAcquire()) return Flux.error(routeFailed(request.getModel()));
            ModelProviderAdapter adapter = adapter(account.getProviderCode());
            String secret = secretStore.get(account.getKeyRef());
            if (secret == null || secret.isBlank()) {
                account.release(false);
                return Flux.error(new ProviderFailure(FailureClass.AUTHENTICATION, 401, "model credential is unavailable"));
            }
            ProviderRequest providerRequest = toProviderRequest(request, true);
            return adapter.stream(providerRequest, account, secret)
                    .timeout(properties.getStreamIdleTimeout())
                    .doOnComplete(() -> account.release(true))
                    .doOnError(error -> account.release(false));
        });
    }

    private Mono<String> attempt(ChatCompletionRequest request, boolean stream, int attempt,
                                 List<Long> used) {
        if (attempt >= properties.getMaxAttempts()) return Mono.error(routeFailed(request.getModel()));
        ModelAccessAccount account = select(request.getModel(), used);
        if (account == null) return Mono.error(routeFailed(request.getModel()));
        if (!account.tryAcquire()) return attempt(request, stream, attempt + 1, append(used, account.getId()));
        ModelProviderAdapter adapter = adapter(account.getProviderCode());
        String secret = secretStore.get(account.getKeyRef());
        if (secret == null || secret.isBlank()) {
            account.release(false);
            return attempt(request, stream, attempt + 1, append(used, account.getId()));
        }
        return adapter.invoke(toProviderRequest(request, false), account, secret)
                .timeout(properties.getResponseTimeout())
                .doOnSuccess(ignored -> account.release(true))
                .onErrorResume(error -> {
                    account.release(false);
                    FailureClass failure = classify(error);
                    penalize(account, failure);
                    if (retryable(failure) && attempt + 1 < properties.getMaxAttempts()) {
                        return attempt(request, false, attempt + 1, append(used, account.getId()));
                    }
                    return Mono.error(error);
                });
    }

    private ModelAccessAccount select(String model, List<Long> excluded) {
        Instant now = Instant.now();
        List<ModelAccessAccount> candidates = accounts.values().stream()
                .filter(account -> model.equals(account.getModelCode()))
                .filter(account -> !excluded.contains(account.getId()))
                .filter(account -> account.available(now))
                .filter(account -> adapter(account.getProviderCode()) != null)
                .sorted(Comparator.comparingDouble((ModelAccessAccount a) -> a.effectiveWeight(properties.getLowBalanceFactor())).reversed())
                .toList();
        if (candidates.isEmpty()) return null;
        double total = candidates.stream().mapToDouble(a -> a.effectiveWeight(properties.getLowBalanceFactor())).sum();
        double pick = ThreadLocalRandom.current().nextDouble(total);
        for (ModelAccessAccount candidate : candidates) {
            pick -= candidate.effectiveWeight(properties.getLowBalanceFactor());
            if (pick <= 0) return candidate;
        }
        return candidates.get(0);
    }

    private ModelProviderAdapter adapter(String provider) {
        return adapters.stream().filter(item -> item.supports(provider)).findFirst().orElse(null);
    }

    private ProviderRequest toProviderRequest(ChatCompletionRequest request, boolean stream) {
        return new ProviderRequest(request.getModel(), request.getMessages(), stream,
                request.getTemperature(), request.getMaxTokens(), request.getExtra());
    }

    private void penalize(ModelAccessAccount account, FailureClass failure) {
        if (failure == FailureClass.INSUFFICIENT_BALANCE) account.setStatus(AccountStatus.DEPLETED);
        if (failure == FailureClass.AUTHENTICATION) account.setStatus(AccountStatus.QUARANTINED);
        if (failure == FailureClass.RATE_LIMITED) account.setCooldownUntil(Instant.now().plusSeconds(10));
        if (account.getConsecutiveFailures().get() >= properties.getCircuitFailureThreshold()) {
            account.setCircuitState(CircuitState.OPEN);
            account.setCooldownUntil(Instant.now().plusSeconds(properties.getCircuitOpenSeconds()));
        }
    }

    private FailureClass classify(Throwable error) {
        if (error instanceof ProviderFailure failure) return failure.failureClass();
        if (error instanceof java.util.concurrent.TimeoutException) return FailureClass.TIMEOUT;
        return FailureClass.CONNECTION;
    }

    private boolean retryable(FailureClass failure) {
        return switch (failure) {
            case RATE_LIMITED, TIMEOUT, CONNECTION, PROVIDER_5XX, INSUFFICIENT_BALANCE, AUTHENTICATION -> true;
            default -> false;
        };
    }

    private BusinessException routeFailed(String model) {
        return new BusinessException(CommonErrorCode.MODEL_ROUTE_FAILED, "模型 " + model + " 当前没有可用账户");
    }

    private List<Long> append(List<Long> values, Long value) {
        List<Long> copy = new ArrayList<>(values);
        copy.add(value);
        return copy;
    }

    @Override
    public List<AccountDTO> accounts(String model) {
        return accounts.values().stream().filter(item -> model == null || model.isBlank() || model.equals(item.getModelCode()))
                .map(this::toDto).toList();
    }

    @Override
    public AccountDTO createAccount(AccountCreateRequest request) {
        long id = sequence.computeIfAbsent(request.getModelCode(), ignored -> new AtomicLong()).incrementAndGet();
        String keyRef = "runtime:model-key:" + id;
        String fingerprint = request.getKeyFingerprint();
        if (fingerprint == null || fingerprint.isBlank()) fingerprint = sha256(request.getApiKey());
        ModelAccessAccount account = ModelAccessAccount.builder()
                .id(id).providerCode(request.getProviderCode()).modelCode(request.getModelCode())
                .accountName(request.getAccountName()).endpoint(trimSlash(request.getEndpoint()))
                .keyRef(keyRef).keyFingerprint(fingerprint).configuredWeight(request.getConfiguredWeight())
                .maxConcurrency(request.getMaxConcurrency() == null ? 0 : request.getMaxConcurrency())
                .balance(request.getBalance()).lowBalanceThreshold(request.getLowBalanceThreshold())
                .hardStopBalanceThreshold(request.getHardStopBalanceThreshold())
                .status(AccountStatus.ACTIVE).circuitState(CircuitState.CLOSED).healthScore(1.0).build();
        secretStore.put(keyRef, request.getApiKey());
        accounts.put(id, account);
        return toDto(account);
    }

    @Override
    public AccountDTO updateStatus(Long id, String status) {
        ModelAccessAccount account = required(id);
        account.setStatus(AccountStatus.valueOf(status.toUpperCase()));
        return toDto(account);
    }

    @Override
    public AccountDTO resetCircuit(Long id) {
        ModelAccessAccount account = required(id);
        account.setCircuitState(CircuitState.CLOSED);
        account.setCooldownUntil(null);
        account.getConsecutiveFailures().set(0);
        account.setHealthScore(1.0);
        return toDto(account);
    }

    public AccountDTO rotate(Long id, RotateAccountRequest request) {
        ModelAccessAccount account = required(id);
        secretStore.put(account.getKeyRef(), request.getApiKey());
        account.setKeyFingerprint(request.getKeyFingerprint() == null || request.getKeyFingerprint().isBlank()
                ? sha256(request.getApiKey()) : request.getKeyFingerprint());
        account.setStatus(AccountStatus.ACTIVE);
        account.setCircuitState(CircuitState.CLOSED);
        account.setCooldownUntil(null);
        return toDto(account);
    }

    public boolean delete(Long id) {
        ModelAccessAccount account = required(id);
        secretStore.delete(account.getKeyRef());
        return accounts.remove(id) != null;
    }

    public AccountDTO updateBalance(Long id, BalanceUpdateRequest request) {
        ModelAccessAccount account = required(id);
        account.setBalance(request.getBalance());
        if (account.getHardStopBalanceThreshold() != null
                && request.getBalance().compareTo(account.getHardStopBalanceThreshold()) > 0
                && account.getStatus() == AccountStatus.DEPLETED) {
            account.setStatus(AccountStatus.ACTIVE);
        }
        return toDto(account);
    }

    @Override
    public RoutePreviewDTO preview(String model) {
        return RoutePreviewDTO.builder().model(model).candidates(accounts(model).stream()
                .sorted(Comparator.comparingDouble(AccountDTO::getEffectiveWeight).reversed()).toList()).build();
    }

    private ModelAccessAccount required(Long id) {
        ModelAccessAccount account = accounts.get(id);
        if (account == null) throw new BusinessException(CommonErrorCode.NOT_FOUND, "模型账户不存在: " + id);
        return account;
    }

    private AccountDTO toDto(ModelAccessAccount a) {
        return AccountDTO.builder().id(a.getId()).providerCode(a.getProviderCode()).modelCode(a.getModelCode())
                .accountName(a.getAccountName()).endpoint(a.getEndpoint()).keyFingerprint(a.getKeyFingerprint())
                .configuredWeight(a.getConfiguredWeight()).maxConcurrency(a.getMaxConcurrency()).inFlight(a.getInFlight().get())
                .balance(a.getBalance()).lowBalanceThreshold(a.getLowBalanceThreshold()).hardStopBalanceThreshold(a.getHardStopBalanceThreshold())
                .status(a.getStatus()).circuitState(a.getCircuitState()).healthScore(a.getHealthScore())
                .effectiveWeight(a.effectiveWeight(properties.getLowBalanceFactor())).totalRequests(a.getTotalRequests().get())
                .failedRequests(a.getFailedRequests().get()).cooldownUntil(a.getCooldownUntil()).build();
    }

    private String trimSlash(String endpoint) {
        return endpoint == null ? null : endpoint.replaceAll("/+$", "");
    }

    private String sha256(String value) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return "unknown";
        }
    }
}
