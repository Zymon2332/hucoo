package dev.hucoo.modelgovernance.application.service;

import java.net.URI;
import java.util.*;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade;
import dev.hucoo.modelgovernance.domain.*;
import dev.hucoo.modelgovernance.infrastructure.secret.ModelCredentialCipher;

/** 治理配置到运行时的桥接，沿用目录准入策略，未发布配置不能被运行时绕过。 */
@Service
public class ModelInvocationConfigurationService implements ModelInvocationConfigurationFacade {
    private final ModelCatalogRepository repository;
    private final ModelCredentialCipher cipher;
    private final ModelCatalogReleasePolicy releasePolicy;
    private final StableModelCatalogPolicy stablePolicy = new StableModelCatalogPolicy();

    public ModelInvocationConfigurationService(ModelCatalogRepository repository, ModelCredentialCipher cipher,
                                               ModelCatalogReleasePolicy releasePolicy) {
        this.repository = repository;
        this.cipher = cipher;
        this.releasePolicy = releasePolicy;
    }

    @Override
    public List<Route> resolve(Context context) {
        if (context == null || context.userId() == null || context.tenantId() == null || context.tenantId().isBlank())
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        if (context.projectId() != null && context.projectId() <= 0)
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "projectId 必须是正整数");
        var snapshot = repository.publicSnapshot(context.tenantId());
        var candidates = new ModelCatalogCandidateResolver().candidates(snapshot, context.tenantId(),
                context.projectId(), context.userId(), context.requestTime()).stream()
                .filter(c -> context.modelCode().equals(c.model().getModelCode()))
                .filter(c -> {
                    var policyContext = new ModelCatalogPolicyContext(context.tenantId(), context.projectId(), context.userId(),
                            context.requestTime(), c.model().getModelCode(), c.version().getVersionCode(), "");
                    return stablePolicy.isVisible(policyContext, c) && releasePolicy.isVisible(policyContext, c);
                }).toList();
        var current = candidates.stream().max(Comparator
                .comparing((ModelCatalogCandidate c) -> c.version().getReleasedAt(), Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(c -> c.version().getVersionCode()).thenComparing(c -> c.version().getId()));
        if (current.isEmpty()) return List.of();
        return candidates.stream().filter(c -> Objects.equals(c.version().getId(), current.get().version().getId()))
                .filter(c -> "OPENAI_COMPATIBLE".equals(c.channel().getProtocolType()))
                .filter(c -> "API_KEY".equals(c.channel().getAuthType()) || "NONE".equals(c.channel().getAuthType()))
                .map(c -> new Route(c.model().getTenantId(), c.target().getId(), c.model().getModelCode(),
                        c.binding().getProviderModelCode(), c.provider().getProviderCode(), "openai-compatible", endpoint(c),
                        c.target().getConfiguredWeight(), value(c.target().getPriority(), c.binding().getPriority()),
                        concurrency(c.target().getMaxConcurrency(), c.binding().getMaxConcurrency()),
                        !"NONE".equals(c.channel().getAuthType()), c.credential() == null ? "" : c.credential().getSecretFingerprint(),
                        () -> c.credential() == null ? "" : cipher.decrypt(c.credential())))
                .sorted(Comparator.comparingInt(Route::priority).thenComparing(Route::targetId)).toList();
    }

    private String endpoint(ModelCatalogCandidate candidate) {
        String value = candidate.target().getEndpointOverride();
        if (value == null || value.isBlank()) value = candidate.binding().getEndpointOverride();
        if (value == null || value.isBlank()) {
            value = candidate.channel().getEndpoint().replaceAll("/+$", "");
            String path = candidate.channel().getBasePath();
            if (path != null && !path.isBlank()) value += "/" + path.replaceAll("^/+|/+$", "");
        }
        URI uri = URI.create(value);
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null)
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "模型渠道地址无效");
        return value.replaceAll("/+$", "");
    }

    private int value(Integer preferred, Integer fallback) { return preferred != null ? preferred : fallback == null ? 0 : fallback; }
    private int concurrency(Integer target, Integer binding) {
        int a = value(target, null), b = value(binding, null);
        return a <= 0 ? b : b <= 0 ? a : Math.min(a, b);
    }
}
