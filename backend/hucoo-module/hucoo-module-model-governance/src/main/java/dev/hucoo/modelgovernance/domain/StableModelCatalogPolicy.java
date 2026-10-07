package dev.hucoo.modelgovernance.domain;

import java.util.Comparator;
import java.util.Objects;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.modelgovernance.domain.entity.*;

/** 正式发布、有效路由和可见性授权共同决定准入，缺失配置时默认隐藏。 */
public class StableModelCatalogPolicy implements ModelCatalogReleasePolicy {
    @Override
    public String policyVersion() {
        return "stable-v1";
    }

    @Override
    public boolean isVisible(ModelCatalogPolicyContext context, ModelCatalogCandidate candidate) {
        LogicalModel model = candidate.model();
        ModelVersion version = candidate.version();
        ModelProvider provider = candidate.provider();
        ModelChannel channel = candidate.channel();
        ModelChannelBinding binding = candidate.binding();
        ModelRoutePolicy route = candidate.routePolicy();
        ModelRouteTarget target = candidate.target();
        if (!"PLATFORM".equals(model.getSourceType()) || model.getOwnerUserId() != null
                || !"PUBLISHED".equals(model.getLifecycleStatus())
                || !"PUBLISHED".equals(version.getReleaseStatus())
                || !"PUBLISHED".equals(provider.getApprovalStatus()) || !Integer.valueOf(1).equals(provider.getStatus())
                || !"PUBLISHED".equals(channel.getApprovalStatus()) || !"ACTIVE".equals(channel.getStatus())
                || "UNHEALTHY".equals(channel.getHealthStatus())
                || !"PUBLISHED".equals(binding.getApprovalStatus()) || !"ACTIVE".equals(binding.getStatus())
                || !Integer.valueOf(1).equals(route.getEnabled()) || !"ACTIVE".equals(target.getStatus())
                || target.getConfiguredWeight() == null || target.getConfiguredWeight() <= 0
                || context.scopePriority(route.getScopeType(), route.getScopeId()) == 0
                || (version.getReleasedAt() != null && version.getReleasedAt().isAfter(context.requestTime()))
                || (version.getDeprecatedAt() != null && !version.getDeprecatedAt().isAfter(context.requestTime()))) {
            return false;
        }
        // 所有关联必须在同一归属租户内闭合，禁止拼接其他租户的凭证或渠道。
        if (!sameTenant(model, version, provider, channel, binding, route, target)
                || !Objects.equals(version.getModelId(), model.getId())
                || !Objects.equals(binding.getModelVersionId(), version.getId())
                || !Objects.equals(binding.getChannelId(), channel.getId())
                || !Objects.equals(channel.getProviderId(), provider.getId())
                || !Objects.equals(target.getBindingId(), binding.getId())
                || !Objects.equals(target.getRoutePolicyId(), route.getId())
                || !Objects.equals(route.getModelId(), model.getId())
                || (route.getModelVersionId() != null && !Objects.equals(route.getModelVersionId(), version.getId()))) {
            return false;
        }
        ModelValidationRun validation = candidate.validation();
        if (validation == null || !sameTenant(binding, validation)
                || !Objects.equals(binding.getLastValidationRunId(), validation.getId())
                || !Objects.equals(validation.getBindingId(), binding.getId())
                || !Objects.equals(validation.getModelVersionId(), version.getId())
                || !"PASSED".equals(validation.getStatus())) return false;
        if (!validCredential(context, candidate)) return false;
        return visibleGrant(context, candidate);
    }

    private boolean validCredential(ModelCatalogPolicyContext context, ModelCatalogCandidate candidate) {
        ModelCredential credential = candidate.credential();
        if ("NONE".equals(candidate.channel().getAuthType()) && candidate.target().getCredentialId() == null) {
            return true;
        }
        return credential != null && sameTenant(candidate.channel(), credential)
                && Objects.equals(credential.getId(), candidate.target().getCredentialId())
                && Objects.equals(credential.getChannelId(), candidate.channel().getId())
                && Objects.equals(credential.getCredentialType(), candidate.channel().getAuthType())
                && "PLATFORM".equals(credential.getOwnerScopeType())
                && (credential.getOwnerScopeId() == null || credential.getOwnerScopeId().isBlank())
                && "ACTIVE".equals(credential.getStatus())
                && (credential.getExpiresAt() == null || credential.getExpiresAt().isAfter(context.requestTime()))
                && ("NONE".equals(credential.getCredentialType())
                    || (credential.getSecretCiphertext() != null && !credential.getSecretCiphertext().isBlank()));
    }

    private boolean visibleGrant(ModelCatalogPolicyContext context, ModelCatalogCandidate candidate) {
        var matching = candidate.grants().stream()
                .filter(grant -> sameTenant(candidate.model(), grant))
                .filter(grant -> Objects.equals(grant.getModelId(), candidate.model().getId()))
                .filter(grant -> context.scopePriority(grant.getScopeType(), grant.getScopeId()) > 0)
                .filter(grant -> grant.getValidFrom() == null || !grant.getValidFrom().isAfter(context.requestTime()))
                .filter(grant -> grant.getValidTo() == null || grant.getValidTo().isAfter(context.requestTime()))
                .toList();
        // DENY 在所有匹配范围内优先，用户 ALLOW 不能覆盖租户禁用。
        if (matching.stream().anyMatch(grant -> "DENY".equals(grant.getEffect()))) return false;
        return matching.stream().max(Comparator.comparingInt(grant ->
                        context.scopePriority(grant.getScopeType(), grant.getScopeId())))
                .map(grant -> "ALLOW".equals(grant.getEffect())).orElse(false);
    }

    private static boolean sameTenant(BaseEntity first, BaseEntity... rest) {
        if (first.getTenantId() == null) return false;
        for (BaseEntity entity : rest) {
            if (entity == null || !first.getTenantId().equals(entity.getTenantId())) return false;
        }
        return true;
    }
}
