package dev.hucoo.modelgovernance.application.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.application.converter.ModelCatalogConverter;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.entity.*;

import static dev.hucoo.modelgovernance.domain.ModelConfigurationValidator.*;

/**
 * 路由配置属于控制平面，调用执行器通过独立契约接入。
 */
@Service
@RequiredArgsConstructor
public class ModelRouteConfigurationService {
    private final ModelCatalogRepository repository;
    private final ModelCatalogConverter converter;

    public List<ModelRoutePolicyDTO> policies(Long modelId) {
        required(LogicalModel.class, modelId);
        return repository.list(ModelRoutePolicy.class).stream().filter(policy -> modelId.equals(policy.getModelId())).map(converter::toDto).toList();
    }

    public ModelRoutePolicyDTO createPolicy(Long modelId, ModelRoutePolicyCreateRequest request) {
        LogicalModel model = required(LogicalModel.class, modelId);
        if (request.getModelVersionId() != null)
            require(required(ModelVersion.class, request.getModelVersionId()).getModelId().equals(modelId), "路由锁定版本必须属于当前逻辑模型");
        ModelRoutePolicy policy = converter.toEntity(request);
        policy.setModelId(modelId);
        policy.setModelCode(model.getModelCode());
        // 旧表必填字段使用固定兼容值，真实供应商由目标映射决定。
        policy.setProviderCode("MULTI_CHANNEL");
        policy.setScopeType(choice(request.getScopeType(), "TENANT", "PLATFORM", "TENANT", "PROJECT", "USER"));
        policy.setScopeId(request.getScopeId());
        if ("PLATFORM".equals(policy.getScopeType())) {
            require("000000".equals(CurrentTenantContext.getTenantId()), "租户路由不能使用平台范围");
            policy.setScopeId("");
        }
        if ("TENANT".equals(policy.getScopeType())) policy.setScopeId(CurrentTenantContext.getTenantId());
        require(policy.getScopeId() != null && ("PLATFORM".equals(policy.getScopeType()) || !policy.getScopeId().isBlank()), "必须指定路由范围对象");
        policy.setSelectionAlgorithm(choice(request.getSelectionAlgorithm(), "PRIORITY_WEIGHTED", "PRIORITY_WEIGHTED", "LOWEST_COST", "LOWEST_LATENCY"));
        policy.setMaxAttempts(positive(request.getMaxAttempts(), 3));
        require(policy.getMaxAttempts() <= 10, "单次路由最多重试 10 次");
        policy.setConnectTimeoutMs(positive(request.getConnectTimeoutMs(), 2000L));
        policy.setResponseTimeoutMs(positive(request.getResponseTimeoutMs(), 30000L));
        policy.setStreamIdleTimeoutMs(positive(request.getStreamIdleTimeoutMs(), 60000L));
        policy.setCircuitFailureThreshold(positive(request.getCircuitFailureThreshold(), 5));
        policy.setCircuitWindowSeconds(positive(request.getCircuitWindowSeconds(), 60));
        policy.setCircuitOpenSeconds(positive(request.getCircuitOpenSeconds(), 30));
        policy.setEnabled(request.getEnabled() == null ? 1 : request.getEnabled());
        require(policy.getEnabled() == 0 || policy.getEnabled() == 1, "路由启用标记只能为 0 或 1");
        json(policy.getQualityRequirementJson(), true);
        json(policy.getRetryableFailureClasses(), false);
        json(policy.getFallbackChain(), false);
        require(repository.list(ModelRoutePolicy.class).stream().noneMatch(item -> modelId.equals(item.getModelId()) && item.getScopeType().equals(policy.getScopeType()) && item.getScopeId().equals(policy.getScopeId())), "该模型范围已有路由策略");
        return converter.toDto(repository.save(policy));
    }

    public void deletePolicy(Long id) {
        required(ModelRoutePolicy.class, id);
        require(repository.list(ModelRouteTarget.class).stream().noneMatch(target -> target.getRoutePolicyId().equals(id)), "路由策略仍有目标，请先删除目标");
        repository.delete(ModelRoutePolicy.class, id);
    }

    public List<ModelRouteTargetDTO> targets(Long policyId) {
        required(ModelRoutePolicy.class, policyId);
        return repository.list(ModelRouteTarget.class).stream().filter(target -> target.getRoutePolicyId().equals(policyId)).map(converter::toDto).toList();
    }

    public ModelRouteTargetDTO createTarget(Long policyId, ModelRouteTargetCreateRequest request) {
        ModelRoutePolicy policy = required(ModelRoutePolicy.class, policyId);
        ModelChannelBinding binding = required(ModelChannelBinding.class, request.getBindingId());
        ModelVersion version = required(ModelVersion.class, binding.getModelVersionId());
        require(version.getModelId().equals(policy.getModelId()), "路由目标映射必须属于策略逻辑模型");
        require(policy.getModelVersionId() == null || policy.getModelVersionId().equals(version.getId()), "路由目标版本必须与策略锁定版本一致");
        ModelChannel channel = required(ModelChannel.class, binding.getChannelId());
        ModelCredential credential = required(ModelCredential.class, request.getCredentialId());
        require(credential.getChannelId().equals(channel.getId()), "凭证必须属于目标映射的供应商渠道");
        require("ACTIVE".equals(credential.getStatus()) && (credential.getExpiresAt() == null || credential.getExpiresAt().isAfter(LocalDateTime.now())), "不能绑定已撤销、禁用或过期凭证");
        require("PLATFORM".equals(credential.getOwnerScopeType()) || "TENANT".equals(credential.getOwnerScopeType())
                || credential.getOwnerScopeType().equals(policy.getScopeType()) && credential.getOwnerScopeId().equals(policy.getScopeId()), "凭证所有权范围不允许当前路由使用");
        ModelRouteTarget target = converter.toEntity(request);
        target.setRoutePolicyId(policyId);
        target.setProviderId(channel.getProviderId());
        target.setModelCode(binding.getProviderModelCode());
        target.setConfiguredWeight(positive(request.getConfiguredWeight(), binding.getDefaultWeight()));
        target.setMaxConcurrency(request.getMaxConcurrency() == null ? binding.getMaxConcurrency() : request.getMaxConcurrency());
        target.setPriority(request.getPriority() == null ? binding.getPriority() : request.getPriority());
        target.setStatus(choice(request.getStatus(), "DISABLED", "ACTIVE", "DRAINING", "DISABLED", "REVOKED"));
        require(target.getHealthThreshold() == null || target.getHealthThreshold().compareTo(BigDecimal.ONE) <= 0, "健康阈值不能大于 1");
        require(repository.list(ModelRouteTarget.class).stream().noneMatch(item -> item.getRoutePolicyId().equals(policyId) && request.getBindingId().equals(item.getBindingId()) && request.getCredentialId().equals(item.getCredentialId())), "相同映射和凭证的路由目标已存在");
        return converter.toDto(repository.save(target));
    }

    public void deleteTarget(Long id) {
        required(ModelRouteTarget.class, id);
        repository.delete(ModelRouteTarget.class, id);
    }

    private int positive(Integer value, int fallback) {
        int result = value == null ? fallback : value;
        require(result > 0, "重试、超时、熔断与权重配置必须大于零");
        return result;
    }

    private long positive(Long value, long fallback) {
        long result = value == null ? fallback : value;
        require(result > 0, "超时配置必须大于零");
        return result;
    }

    private <T extends BaseEntity> T required(Class<T> type, Long id) {
        T entity = repository.find(type, id);
        if (entity == null) throw new ResourceNotFoundException(type.getSimpleName(), id);
        return entity;
    }
}
