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
import dev.hucoo.commons.util.IdGenerator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ModelInvocationService implements ModelRuntimeFacade {
    private final Map<Long, ModelAccessAccount> accounts = new ConcurrentHashMap<>();
    private final SecretStore secretStore;
    private final List<ModelProviderAdapter> adapters;
    private final ModelRuntimeProperties properties;
    private final dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade configuration;
    // 仅缓存健康/并发状态；每次请求重新读取准入配置，不在全局缓存中保存明文密钥。
    private final Map<String, ModelAccessAccount> governedAccounts = new ConcurrentHashMap<>();
    private record InvocationRoute(ModelAccessAccount account, String upstreamModel,
                                   java.util.function.Supplier<String> secret, String providerCode,
                                   String protocol, int priority) {}

    public ModelInvocationService(SecretStore secretStore, List<ModelProviderAdapter> adapters,
                                  ModelRuntimeProperties properties) {
        this(secretStore, adapters, properties, (dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade) null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ModelInvocationService(SecretStore secretStore, List<ModelProviderAdapter> adapters, ModelRuntimeProperties properties,
            org.springframework.beans.factory.ObjectProvider<dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade> configuration) {
        this(secretStore, adapters, properties, configuration.getIfAvailable());
    }

    public ModelInvocationService(SecretStore secretStore, List<ModelProviderAdapter> adapters, ModelRuntimeProperties properties,
            dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade configuration) {
        this.secretStore = secretStore;
        this.adapters = adapters;
        this.properties = properties;
        this.configuration = configuration;
    }

    public Mono<String> invoke(ChatCompletionRequest request) {
        var user = dev.hucoo.component.security.context.CurrentUserContext.get();
        return routes(request, user).flatMap(routes -> attempt(request, routes, 0, List.of()));
    }

    public Flux<String> stream(ChatCompletionRequest request) {
        var user = dev.hucoo.component.security.context.CurrentUserContext.get();
        return routes(request, user).flatMapMany(routes -> Flux.defer(() -> {
            InvocationRoute route = select(routes, List.of());
            if (route == null || !route.account().tryAcquire()) return Flux.error(routeFailed(request.getModel()));
            ModelAccessAccount account = route.account();
            return Flux.defer(() -> adapter(route).stream(
                            toProviderRequest(request, true, route.upstreamModel()), account, secret(route)))
                    .timeout(properties.getStreamIdleTimeout())
                    .doOnError(error -> penalize(account, classify(error)))
                    .doFinally(signal -> account.release(signal == reactor.core.publisher.SignalType.ON_COMPLETE));
        }));
    }

    private Mono<List<InvocationRoute>> routes(ChatCompletionRequest request, dev.hucoo.component.security.context.CurrentUser user) {
        if (!properties.isPersistenceEnabled()) return Mono.fromSupplier(() -> accounts.values().stream()
                .filter(a -> request.getModel().equals(a.getModelCode()))
                .map(a -> new InvocationRoute(a, a.getModelCode(), () -> secretStore.get(a.getKeyRef()),
                        a.getProviderCode(), a.getProviderCode(), 0)).toList());
        // 在 Servlet 请求线程捕获可信身份，避免订阅或重试切换线程后丢失 ThreadLocal。
        if (user == null || user.userId() == null || user.tenantId() == null || user.tenantId().isBlank())
            return Mono.error(new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (configuration == null) return Mono.error(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE,
                "持久化模型运行时未连接治理配置 Facade"));
        var context = new dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade.Context(
                user.tenantId(), user.userId(), request.getProjectId(), request.getModel(), java.time.LocalDateTime.now());
        return Mono.fromCallable(() -> configuration.resolve(context).stream().map(route -> {
            String prefix = route.tenantId() + ":" + route.targetId() + ":";
            String key = prefix + sha256(route.endpoint() + ":" + route.weight() + ":" + route.maxConcurrency()
                    + ":" + route.authenticationRequired() + ":" + route.credentialFingerprint());
            governedAccounts.entrySet().removeIf(e -> e.getKey().startsWith(prefix)
                    && !e.getKey().equals(key) && e.getValue().getInFlight().get() == 0);
            ModelAccessAccount account = governedAccounts.computeIfAbsent(key, ignored -> ModelAccessAccount.builder()
                    .id(route.targetId()).modelCode(route.modelCode()).providerCode(route.protocol()).endpoint(route.endpoint())
                    .accountName("governed:" + route.targetId()).configuredWeight(route.weight())
                    .maxConcurrency(route.maxConcurrency()).status(AccountStatus.ACTIVE).circuitState(CircuitState.CLOSED)
                    .authenticationRequired(route.authenticationRequired()).healthScore(1.0).build());
            // 请求使用自己的配置副本；共享账户只提供状态和并发计数。
            return new InvocationRoute(account, route.providerModelCode(), route.credential(), route.providerCode(),
                    route.protocol(), route.priority());
        }).toList()).subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic());
    }

    private String secret(InvocationRoute route) {
        String secret = route.secret().get();
        if (route.account().isAuthenticationRequired() && (secret == null || secret.isBlank()))
            throw new ProviderFailure(FailureClass.AUTHENTICATION, 401, "model credential is unavailable");
        return secret;
    }

    private Mono<String> attempt(ChatCompletionRequest request, List<InvocationRoute> routes,
                                 int attempt, List<Long> used) {
        if (attempt >= properties.getMaxAttempts()) return Mono.error(routeFailed(request.getModel()));
        InvocationRoute route = select(routes, used);
        if (route == null) return Mono.error(routeFailed(request.getModel()));
        ModelAccessAccount account = route.account();
        if (!account.tryAcquire()) return attempt(request, routes, attempt + 1, append(used, account.getId()));
        return Mono.defer(() -> adapter(route).invoke(
                        toProviderRequest(request, false, route.upstreamModel()), account, secret(route)))
                .timeout(properties.getResponseTimeout())
                .doOnSuccess(ignored -> account.release(true))
                .doFinally(signal -> { if (signal == reactor.core.publisher.SignalType.CANCEL) account.release(false); })
                .onErrorResume(error -> {
                    account.release(false);
                    FailureClass failure = classify(error);
                    penalize(account, failure);
                    if (retryable(failure) && attempt + 1 < properties.getMaxAttempts()
                            && select(routes, append(used, account.getId())) != null)
                        return attempt(request, routes, attempt + 1, append(used, account.getId()));
                    return Mono.error(error);
                });
    }

    private InvocationRoute select(List<InvocationRoute> routes, List<Long> excluded) {
        Instant now = Instant.now();
        var candidates = routes.stream().filter(r -> !excluded.contains(r.account().getId()))
                .filter(r -> r.account().available(now)).filter(r -> adapter(r) != null).toList();
        if (candidates.isEmpty()) return null;
        int priority = candidates.stream().mapToInt(InvocationRoute::priority).min().orElse(0);
        candidates = candidates.stream().filter(r -> r.priority() == priority).toList();
        double total = candidates.stream().mapToDouble(r -> r.account().effectiveWeight(properties.getLowBalanceFactor())).sum();
        double pick = ThreadLocalRandom.current().nextDouble(total);
        for (var candidate : candidates) {
            pick -= candidate.account().effectiveWeight(properties.getLowBalanceFactor());
            if (pick <= 0) return candidate;
        }
        return candidates.getFirst();
    }

    private ModelProviderAdapter adapter(String provider) {
        return adapters.stream().filter(item -> item.supports(provider)).findFirst().orElse(null);
    }

    private ModelProviderAdapter adapter(InvocationRoute route) {
        ModelProviderAdapter providerAdapter = adapter(route.providerCode());
        return providerAdapter != null ? providerAdapter : adapter(route.protocol());
    }

    private ProviderRequest toProviderRequest(ChatCompletionRequest request, boolean stream, String upstreamModel) {
        return new ProviderRequest(upstreamModel, request.getMessages(), stream,
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
        // ID 必须在整个运行时实例内唯一，不能按模型分别从 1 开始，否则不同模型会互相覆盖账户。
        long id = IdGenerator.nextId();
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
