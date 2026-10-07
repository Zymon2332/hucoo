package dev.hucoo.modelgovernance.domain;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.modelgovernance.domain.entity.*;

/** 构建闭合候选链，并以最具体的路由范围限制候选。 */
public class ModelCatalogCandidateResolver {
    public List<ModelCatalogCandidate> candidates(ModelCatalogSnapshot snapshot, String tenantId,
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
            if (priority == 0 || priority != routePriorities.getOrDefault(route.getTenantId() + ":" + route.getModelId(), 0))
                continue;
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

    private static <T extends BaseEntity> Map<Long, T> index(ModelCatalogSnapshot snapshot, Class<T> type) {
        return snapshot.list(type).stream().collect(Collectors.toMap(BaseEntity::getId, Function.identity()));
    }
}
