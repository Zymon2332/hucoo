package dev.hucoo.modelgovernance.application.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.modelgovernance.api.ModelPublicCatalogFacade;
import dev.hucoo.modelgovernance.api.dto.PublicModelCatalogQuery;
import dev.hucoo.modelgovernance.application.converter.PublicModelCatalogConverter;
import dev.hucoo.modelgovernance.client.dto.*;
import dev.hucoo.modelgovernance.domain.*;
import dev.hucoo.modelgovernance.domain.entity.*;

@Service
public class PublicModelCatalogApplicationService implements ModelPublicCatalogFacade {
    private final ModelCatalogRepository repository;
    private final PublicModelCatalogConverter converter;
    private final ModelCatalogReleasePolicy releasePolicy;
    private final Clock clock;
    private final StableModelCatalogPolicy stablePolicy = new StableModelCatalogPolicy();

    public PublicModelCatalogApplicationService(ModelCatalogRepository repository,
            PublicModelCatalogConverter converter, ModelCatalogReleasePolicy releasePolicy,
            @Qualifier("modelCatalogClock") Clock clock) {
        this.repository = repository;
        this.converter = converter;
        this.releasePolicy = releasePolicy;
        this.clock = clock;
    }

    @Override
    public PublicModelCatalogDTO catalog(PublicModelCatalogQuery query) {
        var user = CurrentUserContext.require();
        if (user.userId() == null || user.tenantId() == null || user.tenantId().isBlank()) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        }
        Long projectId = query == null ? null : query.projectId();
        if (projectId != null && projectId <= 0) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "projectId 必须是正整数");
        }
        LocalDateTime now = LocalDateTime.now(clock);
        ModelCatalogSnapshot snapshot = repository.publicSnapshot(user.tenantId());
        var candidates = candidates(snapshot, user.tenantId(), projectId, user.userId(), now).stream()
                .filter(candidate -> stablePolicy.isVisible(new ModelCatalogPolicyContext(user.tenantId(), projectId,
                        user.userId(), now, candidate.model().getModelCode(), candidate.version().getVersionCode(), ""), candidate))
                .toList();
        // 提供给灰度策略的基线版本仅由安全 DTO 构成，不对密钥或内部路由做摘要。
        String baselineVersion = digest(group(snapshot, candidates));
        List<ModelCatalogCandidate> visible = candidates.stream().filter(candidate -> releasePolicy.isVisible(
                new ModelCatalogPolicyContext(user.tenantId(), projectId, user.userId(), now,
                        candidate.model().getModelCode(), candidate.version().getVersionCode(), baselineVersion), candidate))
                .toList();
        var providers = group(snapshot, visible);
        String policyVersion = releasePolicy.policyVersion();
        return new PublicModelCatalogDTO(digest(List.of(policyVersion, providers)), policyVersion, providers);
    }

    private List<ModelCatalogCandidate> candidates(ModelCatalogSnapshot snapshot, String tenantId,
            Long projectId, Long userId, LocalDateTime now) {
        var models = index(snapshot, LogicalModel.class);
        var versions = index(snapshot, ModelVersion.class);
        var providers = index(snapshot, ModelProvider.class);
        var channels = index(snapshot, ModelChannel.class);
        var bindings = index(snapshot, ModelChannelBinding.class);
        var validations = index(snapshot, ModelValidationRun.class);
        var credentials = index(snapshot, ModelCredential.class);
        var routes = index(snapshot, ModelRoutePolicy.class);
        var context = new ModelCatalogPolicyContext(tenantId, projectId, userId, now, "", "", "");
        // 同一归属租户、同一模型只采用最具体的已启用路由范围，避免较宽范围绕过项目路由。
        Map<String, Integer> routePriorities = new HashMap<>();
        routes.values().stream().filter(route -> Integer.valueOf(1).equals(route.getEnabled())).forEach(route ->
                routePriorities.merge(route.getTenantId() + ":" + route.getModelId(),
                        context.scopePriority(route.getScopeType(), route.getScopeId()), Math::max));
        List<ModelCatalogCandidate> candidates = new ArrayList<>();
        for (ModelRouteTarget target : snapshot.list(ModelRouteTarget.class)) {
            ModelChannelBinding binding = bindings.get(target.getBindingId());
            ModelRoutePolicy route = routes.get(target.getRoutePolicyId());
            if (binding == null || route == null) continue;
            int priority = context.scopePriority(route.getScopeType(), route.getScopeId());
            if (priority == 0 || priority != routePriorities.getOrDefault(route.getTenantId() + ":" + route.getModelId(), 0)) continue;
            ModelVersion version = versions.get(binding.getModelVersionId());
            ModelChannel channel = channels.get(binding.getChannelId());
            if (version == null || channel == null) continue;
            LogicalModel model = models.get(version.getModelId());
            ModelProvider provider = providers.get(channel.getProviderId());
            if (model == null || provider == null) continue;
            candidates.add(new ModelCatalogCandidate(model, version, provider, channel, binding,
                    validations.get(binding.getLastValidationRunId()), credentials.get(target.getCredentialId()),
                    route, target, snapshot.list(ModelVisibilityGrant.class)));
        }
        return candidates;
    }

    private List<PublicModelProviderGroupDTO> group(ModelCatalogSnapshot snapshot, List<ModelCatalogCandidate> candidates) {
        Comparator<ModelCatalogCandidate> currentVersion = Comparator
                .comparing((ModelCatalogCandidate candidate) -> candidate.version().getReleasedAt(), Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(candidate -> candidate.version().getVersionCode())
                .thenComparing(candidate -> candidate.version().getId());
        Map<String, ModelCatalogCandidate> current = new HashMap<>();
        for (var candidate : candidates) {
            current.merge(candidate.model().getModelCode(), candidate,
                    (left, right) -> currentVersion.compare(left, right) >= 0 ? left : right);
        }
        Map<String, Map<String, PublicModelDTO>> groups = new TreeMap<>();
        Map<String, String> names = new TreeMap<>();
        // 同一模型有多家可用供应商时出现在各组中；同组内多个渠道只返回一次。
        for (var candidate : candidates) {
            var selected = current.get(candidate.model().getModelCode());
            if (!Objects.equals(selected.version().getId(), candidate.version().getId())) continue;
            String providerCode = candidate.provider().getProviderCode();
            names.merge(providerCode, candidate.provider().getProviderName(), (left, right) -> left.compareTo(right) <= 0 ? left : right);
            groups.computeIfAbsent(providerCode, ignored -> new TreeMap<>())
                    .putIfAbsent(candidate.model().getModelCode(), modelDto(snapshot, candidate));
        }
        return groups.entrySet().stream().map(entry -> new PublicModelProviderGroupDTO(entry.getKey(),
                names.get(entry.getKey()), List.copyOf(entry.getValue().values()))).toList();
    }

    private PublicModelDTO modelDto(ModelCatalogSnapshot snapshot, ModelCatalogCandidate candidate) {
        var capabilities = snapshot.list(ModelVersionCapability.class).stream()
                .filter(capability -> Objects.equals(capability.getTenantId(), candidate.version().getTenantId()))
                .filter(capability -> Objects.equals(capability.getModelVersionId(), candidate.version().getId()))
                .filter(capability -> Integer.valueOf(1).equals(capability.getSupported()))
                .map(ModelVersionCapability::getCapabilityCode).filter(Objects::nonNull).distinct().sorted().toList();
        return converter.toDto(candidate.model(), candidate.version(), capabilities);
    }

    private static <T extends BaseEntity> Map<Long, T> index(ModelCatalogSnapshot snapshot, Class<T> type) {
        return snapshot.list(type).stream().collect(Collectors.toMap(BaseEntity::getId, Function.identity()));
    }

    private static String digest(Object value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(JsonUtil.mapper().writeValueAsString(value).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }
}
