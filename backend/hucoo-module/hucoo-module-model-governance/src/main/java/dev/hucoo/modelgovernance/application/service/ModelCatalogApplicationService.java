package dev.hucoo.modelgovernance.application.service;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.application.converter.ModelCatalogConverter;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.entity.*;
import dev.hucoo.modelgovernance.infrastructure.secret.ModelCredentialCipher;
import static dev.hucoo.modelgovernance.domain.ModelConfigurationValidator.*;

@Service
@RequiredArgsConstructor
public class ModelCatalogApplicationService {
    private final ModelCatalogRepository repository;
    private final ModelCatalogConverter converter;
    private final ModelCredentialCipher cipher;

    public PageResult<LogicalModelDTO> models(ModelDefinitionQueryRequest query) {
        String keyword = query.getKeyword();
        List<LogicalModel> models = repository.list(LogicalModel.class).stream()
                .filter(model -> keyword == null || keyword.isBlank() || model.getModelCode().contains(keyword) || model.getModelName().contains(keyword))
                .toList();
        long page = query.resolvePageNum();
        long size = query.resolvePageSize();
        int start = (int) Math.min(models.size(), (page - 1) * size);
        int end = (int) Math.min(models.size(), start + size);
        return PageResult.of(models.subList(start, end).stream().map(converter::toDto).toList(), models.size(), page, size);
    }

    public LogicalModelDTO model(Long id) { return converter.toDto(required(LogicalModel.class, id)); }

    public LogicalModelDTO createModel(LogicalModelCreateRequest request) {
        LogicalModel entity = converter.toEntity(request);
        entity.setSourceType(choice(request.getSourceType(), "PLATFORM", "PLATFORM", "CUSTOM", "LOCAL", "ENTERPRISE"));
        choice(request.getModelType(), null, "CHAT", "EMBEDDING", "RERANK", "IMAGE", "AUDIO");
        json(request.getMetadataJson(), false);
        unique(LogicalModel.class, model -> model.getModelCode().equals(request.getModelCode()), "模型编码已存在");
        entity.setLifecycleStatus("DRAFT");
        return converter.toDto(repository.save(entity));
    }

    public LogicalModelDTO updateModel(Long id, LogicalModelCreateRequest request) {
        LogicalModel entity = required(LogicalModel.class, id);
        require(repository.list(LogicalModel.class).stream().noneMatch(item -> !item.getId().equals(id) && item.getModelCode().equals(request.getModelCode())), "模型编码已存在");
        choice(request.getModelType(), null, "CHAT", "EMBEDDING", "RERANK", "IMAGE", "AUDIO");
        json(request.getMetadataJson(), false);
        converter.update(request, entity);
        entity.setSourceType(choice(request.getSourceType(), "PLATFORM", "PLATFORM", "CUSTOM", "LOCAL", "ENTERPRISE"));
        entity.setLifecycleStatus("DRAFT");
        return converter.toDto(repository.save(entity));
    }

    public void deleteModel(Long id) {
        required(LogicalModel.class, id);
        require(repository.list(ModelVersion.class).stream().noneMatch(version -> version.getModelId().equals(id)), "模型仍有版本，请先删除版本");
        require(repository.list(ModelRoutePolicy.class).stream().noneMatch(policy -> id.equals(policy.getModelId())), "模型仍有路由策略，请先删除策略");
        repository.inTransaction(() -> {
            repository.list(ModelVisibilityGrant.class).stream().filter(grant -> grant.getModelId().equals(id)).forEach(grant -> repository.delete(ModelVisibilityGrant.class, grant.getId()));
            repository.delete(LogicalModel.class, id);
            return true;
        });
    }

    public List<ModelVersionDTO> versions(Long modelId) {
        required(LogicalModel.class, modelId);
        return repository.list(ModelVersion.class).stream().filter(version -> version.getModelId().equals(modelId)).map(converter::toDto).toList();
    }

    public ModelVersionDTO createVersion(Long modelId, ModelVersionCreateRequest request) {
        required(LogicalModel.class, modelId);
        unique(ModelVersion.class, version -> version.getModelId().equals(modelId) && version.getVersionCode().equals(request.getVersionCode()), "模型版本编码已存在");
        validateVersion(request);
        ModelVersion version = converter.toEntity(request);
        version.setModelId(modelId);
        version.setReleaseStatus("DRAFT");
        return converter.toDto(repository.save(version));
    }

    public ModelVersionDTO updateVersion(Long id, ModelVersionCreateRequest request) {
        ModelVersion version = required(ModelVersion.class, id);
        validateVersion(request);
        require(repository.list(ModelVersion.class).stream().noneMatch(item -> !item.getId().equals(id) && item.getModelId().equals(version.getModelId()) && item.getVersionCode().equals(request.getVersionCode())), "模型版本编码已存在");
        converter.update(request, version);
        version.setReleaseStatus("DRAFT");
        return converter.toDto(repository.save(version));
    }

    public void deleteVersion(Long id) {
        required(ModelVersion.class, id);
        require(repository.list(ModelChannelBinding.class).stream().noneMatch(binding -> binding.getModelVersionId().equals(id)), "版本仍有渠道映射，请先删除映射");
        require(repository.list(ModelRoutePolicy.class).stream().noneMatch(policy -> id.equals(policy.getModelVersionId())), "版本仍被路由策略锁定，请先删除策略");
        repository.inTransaction(() -> {
            repository.list(ModelVersionCapability.class).stream().filter(capability -> capability.getModelVersionId().equals(id)).forEach(capability -> repository.delete(ModelVersionCapability.class, capability.getId()));
            repository.delete(ModelVersion.class, id);
            return true;
        });
    }

    private void validateVersion(ModelVersionCreateRequest request) {
        require(request.getContextWindow() == null || request.getMaxInputTokens() == null || request.getMaxInputTokens() <= request.getContextWindow(), "输入上限不能超过上下文长度");
        require(request.getContextWindow() == null || request.getMaxOutputTokens() == null || request.getMaxOutputTokens() <= request.getContextWindow(), "输出上限不能超过上下文长度");
        json(request.getInputModalitiesJson(), false);
        json(request.getOutputModalitiesJson(), false);
        json(request.getDefaultParametersJson(), false);
        json(request.getMetadataJson(), false);
    }

    public List<ModelChannelBindingDTO> bindings(Long versionId) {
        required(ModelVersion.class, versionId);
        return repository.list(ModelChannelBinding.class).stream().filter(binding -> binding.getModelVersionId().equals(versionId)).map(converter::toDto).toList();
    }

    public ModelChannelBindingDTO createBinding(Long versionId, ModelChannelBindingCreateRequest request) {
        required(ModelVersion.class, versionId);
        required(ModelChannel.class, request.getChannelId());
        validateBinding(request);
        unique(ModelChannelBinding.class, binding -> binding.getModelVersionId().equals(versionId) && binding.getChannelId().equals(request.getChannelId()) && binding.getProviderModelCode().equals(request.getProviderModelCode()), "模型渠道映射已存在");
        ModelChannelBinding binding = converter.toEntity(request);
        binding.setModelVersionId(versionId);
        defaults(binding);
        return converter.toDto(repository.save(binding));
    }

    public ModelChannelBindingDTO updateBinding(Long id, ModelChannelBindingCreateRequest request) {
        ModelChannelBinding binding = required(ModelChannelBinding.class, id);
        required(ModelChannel.class, request.getChannelId());
        require(binding.getChannelId().equals(request.getChannelId())
                || repository.list(ModelRouteTarget.class).stream().noneMatch(target -> id.equals(target.getBindingId())),
                "映射已有路由目标，请先删除目标再更换渠道");
        validateBinding(request);
        require(repository.list(ModelChannelBinding.class).stream().noneMatch(item -> !item.getId().equals(id) && item.getModelVersionId().equals(binding.getModelVersionId()) && item.getChannelId().equals(request.getChannelId()) && item.getProviderModelCode().equals(request.getProviderModelCode())), "模型渠道映射已存在");
        converter.update(request, binding);
        defaults(binding);
        binding.setLastValidationRunId(null);
        return converter.toDto(repository.save(binding));
    }

    private void defaults(ModelChannelBinding binding) {
        binding.setDefaultWeight(binding.getDefaultWeight() == null ? 1 : binding.getDefaultWeight());
        binding.setPriority(binding.getPriority() == null ? 0 : binding.getPriority());
        binding.setMaxConcurrency(binding.getMaxConcurrency() == null ? 0 : binding.getMaxConcurrency());
        binding.setStatus("ACTIVE");
        binding.setApprovalStatus("PENDING_APPROVAL");
    }

    private void validateBinding(ModelChannelBindingCreateRequest request) {
        require(request.getDefaultWeight() == null || request.getDefaultWeight() > 0, "路由权重必须大于零");
        if (request.getEndpointOverride() != null) endpoint(request.getEndpointOverride());
        json(request.getCapabilityOverrideJson(), true);
    }

    public void deleteBinding(Long id) {
        required(ModelChannelBinding.class, id);
        require(repository.list(ModelChannelPrice.class).stream().noneMatch(price -> price.getBindingId().equals(id)), "映射仍有价格配置，请先删除价格");
        require(repository.list(ModelRouteTarget.class).stream().noneMatch(target -> id.equals(target.getBindingId())), "映射仍被路由目标使用，请先删除目标");
        repository.delete(ModelChannelBinding.class, id);
    }

    public List<ModelVersionCapabilityDTO> capabilities(Long versionId) {
        required(ModelVersion.class, versionId);
        return repository.list(ModelVersionCapability.class).stream().filter(capability -> capability.getModelVersionId().equals(versionId)).map(converter::toDto).toList();
    }

    public ModelVersionCapabilityDTO setCapability(Long versionId, ModelVersionCapabilityCreateRequest request) {
        return repository.inTransaction(() -> {
            ModelVersion version = required(ModelVersion.class, versionId);
            json(request.getConstraintJson(), false);
            require(request.getSupported() == null || request.getSupported() == 0 || request.getSupported() == 1, "能力支持标记只能为 0 或 1");
            ModelVersionCapability entity = repository.list(ModelVersionCapability.class).stream()
                    .filter(item -> item.getModelVersionId().equals(versionId) && item.getCapabilityCode().equals(request.getCapabilityCode())).findFirst().orElseGet(ModelVersionCapability::new);
            converter.update(request, entity);
            entity.setModelVersionId(versionId);
            entity.setSupported(request.getSupported() == null ? 1 : request.getSupported());
            repository.save(entity);
            // 能力声明变更后，已有版本发布状态失效。
            version.setReleaseStatus("DRAFT");
            repository.save(version);
            return converter.toDto(entity);
        });
    }

    public List<ModelChannelPriceDTO> prices(Long bindingId) {
        required(ModelChannelBinding.class, bindingId);
        return repository.list(ModelChannelPrice.class).stream().filter(price -> price.getBindingId().equals(bindingId)).map(converter::toDto).toList();
    }

    public ModelChannelPriceDTO createPrice(Long bindingId, ModelChannelPriceCreateRequest request) {
        return repository.inTransaction(() -> {
            if (repository.lock(ModelChannelBinding.class, bindingId) == null) {
                throw new ResourceNotFoundException("ModelChannelBinding", bindingId);
            }
            return createPriceUnderLock(bindingId, request);
        });
    }

    private ModelChannelPriceDTO createPriceUnderLock(Long bindingId, ModelChannelPriceCreateRequest request) {
        choice(request.getBillingDimension(), null, "INPUT_TOKEN", "OUTPUT_TOKEN", "CACHE_READ_TOKEN", "CACHE_WRITE_TOKEN", "REQUEST");
        ModelChannelPrice price = converter.toEntity(request);
        price.setBindingId(bindingId);
        price.setTierStart(price.getTierStart() == null ? 0L : price.getTierStart());
        price.setUnitScale(price.getUnitScale() == null ? 1000000L : price.getUnitScale());
        price.setCurrency(price.getCurrency() == null ? "USD" : price.getCurrency());
        price.setEffectiveFrom(price.getEffectiveFrom() == null ? LocalDateTime.now() : price.getEffectiveFrom());
        require(price.getUnitPrice() != null && price.getUnitPrice().compareTo(BigDecimal.ZERO) >= 0 && price.getUnitScale() > 0, "价格不得为负，计价单位必须大于零");
        require(price.getTierEnd() == null || price.getTierEnd() >= price.getTierStart(), "阶梯结束值不能小于起始值");
        require(price.getEffectiveTo() == null || price.getEffectiveTo().isAfter(price.getEffectiveFrom()), "价格失效时间必须晚于生效时间");
        require(repository.list(ModelChannelPrice.class).stream().noneMatch(item -> item.getBindingId().equals(bindingId) && item.getBillingDimension().equals(price.getBillingDimension())
                && overlaps(item.getTierStart(), item.getTierEnd(), price.getTierStart(), price.getTierEnd())
                && overlaps(item.getEffectiveFrom(), item.getEffectiveTo(), price.getEffectiveFrom(), price.getEffectiveTo())), "同一计费维度的阶梯区间与生效区间不能同时重叠");
        return converter.toDto(repository.save(price));
    }

    private boolean overlaps(Long a, Long b, Long c, Long d) { return (b == null || c <= b) && (d == null || a <= d); }
    private boolean overlaps(LocalDateTime a, LocalDateTime b, LocalDateTime c, LocalDateTime d) { return (b == null || c.isBefore(b)) && (d == null || a.isBefore(d)); }
    public void deletePrice(Long id) { required(ModelChannelPrice.class, id); repository.delete(ModelChannelPrice.class, id); }

    public List<ModelVisibilityGrantDTO> grants(Long modelId) {
        required(LogicalModel.class, modelId);
        return repository.list(ModelVisibilityGrant.class).stream().filter(grant -> grant.getModelId().equals(modelId)).map(converter::toDto).toList();
    }

    public ModelVisibilityGrantDTO createGrant(Long modelId, ModelVisibilityGrantCreateRequest request) {
        required(LogicalModel.class, modelId);
        choice(request.getScopeType(), null, "PLATFORM", "TENANT", "PROJECT", "USER");
        ModelVisibilityGrant grant = converter.toEntity(request);
        grant.setModelId(modelId);
        grant.setEffect(choice(request.getEffect(), "ALLOW", "ALLOW", "DENY"));
        grant.setScopeId("PLATFORM".equals(grant.getScopeType()) ? "" : request.getScopeId());
        require("PLATFORM".equals(grant.getScopeType()) || grant.getScopeId() != null && !grant.getScopeId().isBlank(), "非平台授权必须指定范围对象");
        require(!"PLATFORM".equals(grant.getScopeType()) || "000000".equals(CurrentTenantContext.getTenantId()), "租户模型不能授予平台范围可见性");
        require(!"TENANT".equals(grant.getScopeType()) || CurrentTenantContext.getTenantId().equals(grant.getScopeId()), "只能授权当前租户");
        require(grant.getValidFrom() == null || grant.getValidTo() == null || grant.getValidTo().isAfter(grant.getValidFrom()), "授权失效时间必须晚于生效时间");
        unique(ModelVisibilityGrant.class, item -> item.getModelId().equals(modelId) && item.getScopeType().equals(grant.getScopeType()) && item.getScopeId().equals(grant.getScopeId()), "该范围已有可见性授权");
        return converter.toDto(repository.save(grant));
    }
    public void deleteGrant(Long id) { required(ModelVisibilityGrant.class, id); repository.delete(ModelVisibilityGrant.class, id); }

    public List<ModelCredentialDTO> credentials(Long channelId) {
        required(ModelChannel.class, channelId);
        return repository.list(ModelCredential.class).stream().filter(credential -> credential.getChannelId().equals(channelId)).map(converter::toDto).toList();
    }

    public ModelCredentialDTO createCredential(Long channelId, ModelCredentialCreateRequest request) {
        required(ModelChannel.class, channelId);
        ModelCredential credential = new ModelCredential();
        credential.setChannelId(channelId);
        credential.setTenantId(CurrentTenantContext.getTenantId());
        credential.setCredentialName(request.getCredentialName());
        credential.setCredentialType(choice(request.getCredentialType(), "API_KEY", "API_KEY", "OAUTH2", "MTLS"));
        credential.setOwnerScopeType(choice(request.getOwnerScopeType(), "TENANT", "PLATFORM", "TENANT", "PROJECT", "USER"));
        credential.setOwnerScopeId(request.getOwnerScopeId());
        if ("TENANT".equals(credential.getOwnerScopeType())) credential.setOwnerScopeId(CurrentTenantContext.getTenantId());
        require(!"PLATFORM".equals(credential.getOwnerScopeType()) || "000000".equals(CurrentTenantContext.getTenantId()), "租户凭证不能属于平台范围");
        require(!List.of("PROJECT", "USER").contains(credential.getOwnerScopeType()) || credential.getOwnerScopeId() != null && !credential.getOwnerScopeId().isBlank(), "项目或用户凭证必须指定所有者");
        validateExpiry(request.getExpiresAt());
        credential.setExpiresAt(request.getExpiresAt());
        credential.setStatus("ACTIVE");
        cipher.encrypt(credential, request.getSecret());
        unique(ModelCredential.class, item -> item.getChannelId().equals(channelId) && item.getSecretFingerprint().equals(credential.getSecretFingerprint()), "该渠道已存在相同凭证");
        return converter.toDto(repository.save(credential));
    }

    public ModelCredentialDTO rotateCredential(Long id, ModelCredentialRotateRequest request) {
        return repository.inTransaction(() -> {
            ModelCredential credential = required(ModelCredential.class, id);
            require(!"REVOKED".equals(credential.getStatus()), "已撤销凭证不能通过轮换恢复");
            validateExpiry(request.getExpiresAt());
            String oldFingerprint = credential.getSecretFingerprint();
            cipher.encrypt(credential, request.getSecret());
            require(!oldFingerprint.equals(credential.getSecretFingerprint()), "新凭证必须与原凭证不同");
            require(repository.list(ModelCredential.class).stream().noneMatch(item -> !item.getId().equals(id) && item.getChannelId().equals(credential.getChannelId()) && item.getSecretFingerprint().equals(credential.getSecretFingerprint())), "该渠道已存在相同凭证");
            credential.setExpiresAt(request.getExpiresAt());
            credential.setLastRotatedAt(LocalDateTime.now());
            credential.setLastVerifiedAt(null);
            credential.setStatus("ACTIVE");
            repository.save(credential);
            ModelCredentialRotation rotation = new ModelCredentialRotation();
            rotation.setCredentialId(id);
            rotation.setOldFingerprint(oldFingerprint);
            rotation.setNewFingerprint(credential.getSecretFingerprint());
            rotation.setOperatorId(CurrentUserContext.userId());
            rotation.setReason(request.getReason());
            rotation.setRotatedAt(credential.getLastRotatedAt());
            repository.save(rotation);
            return converter.toDto(credential);
        });
    }

    public ModelCredentialDTO revokeCredential(Long id) {
        ModelCredential credential = required(ModelCredential.class, id);
        credential.setStatus("REVOKED");
        return converter.toDto(repository.save(credential));
    }

    private void validateExpiry(LocalDateTime expiresAt) { require(expiresAt == null || expiresAt.isAfter(LocalDateTime.now()), "凭证过期时间必须在未来"); }

    /** 只能由具有独立审核权限的接口触发；配置编辑接口不接收审批状态。 */
    public Object approve(String resource, Long id) {
        return switch (resource) {
            case "models" -> {
                LogicalModel model = required(LogicalModel.class, id);
                model.setLifecycleStatus("PUBLISHED");
                yield converter.toDto(repository.save(model));
            }
            case "versions" -> {
                ModelVersion version = required(ModelVersion.class, id);
                require("PUBLISHED".equals(required(LogicalModel.class, version.getModelId()).getLifecycleStatus()), "请先审核逻辑模型");
                version.setReleaseStatus("PUBLISHED");
                version.setReleasedAt(LocalDateTime.now());
                yield converter.toDto(repository.save(version));
            }
            case "channels" -> {
                ModelChannel channel = required(ModelChannel.class, id);
                require("PUBLISHED".equals(required(ModelProvider.class, channel.getProviderId()).getApprovalStatus()), "请先审核供应商");
                channel.setApprovalStatus("PUBLISHED");
                yield channelDto(repository.save(channel));
            }
            case "bindings" -> {
                ModelChannelBinding binding = required(ModelChannelBinding.class, id);
                require("PUBLISHED".equals(required(ModelVersion.class, binding.getModelVersionId()).getReleaseStatus()), "请先审核模型版本");
                require("PUBLISHED".equals(required(ModelChannel.class, binding.getChannelId()).getApprovalStatus()), "请先审核供应商渠道");
                binding.setApprovalStatus("PUBLISHED");
                yield converter.toDto(repository.save(binding));
            }
            case "providers" -> {
                ModelProvider provider = required(ModelProvider.class, id);
                provider.setApprovalStatus("PUBLISHED");
                yield providerDto(repository.save(provider));
            }
            default -> throw new BusinessException(CommonErrorCode.BAD_REQUEST, "不支持的审核对象");
        };
    }

    public <T extends BaseEntity> T required(Class<T> type, Long id) {
        T entity = repository.find(type, id);
        if (entity == null) throw new ResourceNotFoundException(type.getSimpleName(), id);
        return entity;
    }

    private <T extends BaseEntity> void unique(Class<T> type, java.util.function.Predicate<T> duplicate, String message) {
        require(repository.list(type).stream().noneMatch(duplicate), message);
    }

    private ModelChannelDTO channelDto(ModelChannel channel) { return converter.toDto(channel); }
    private ModelProviderDTO providerDto(ModelProvider provider) { return converter.toDto(provider); }
}
