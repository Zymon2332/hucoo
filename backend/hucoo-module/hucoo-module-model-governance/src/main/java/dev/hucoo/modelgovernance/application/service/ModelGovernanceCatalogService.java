package dev.hucoo.modelgovernance.application.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.modelgovernance.api.dto.CustomModelRegistrationCreateRequest;
import dev.hucoo.modelgovernance.api.dto.CustomModelRegistrationDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.api.dto.ModelChannelCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelChannelDTO;
import dev.hucoo.modelgovernance.api.dto.ModelKeyCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelKeyDTO;
import dev.hucoo.modelgovernance.api.dto.ModelProviderCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelProviderDTO;
import dev.hucoo.modelgovernance.api.dto.RoutingRuleCreateRequest;
import dev.hucoo.modelgovernance.api.dto.RoutingRuleDTO;
import dev.hucoo.modelgovernance.domain.entity.CustomModelRegistration;
import dev.hucoo.modelgovernance.domain.entity.ModelKey;
import dev.hucoo.modelgovernance.domain.entity.RoutingRule;
import dev.hucoo.modelgovernance.infrastructure.mapper.CustomModelRegistrationMapper;
import dev.hucoo.modelgovernance.infrastructure.mapper.ModelKeyMapper;
import dev.hucoo.modelgovernance.infrastructure.mapper.RoutingRuleMapper;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class ModelGovernanceCatalogService implements ModelGovernanceCatalogFacade {

    private final ModelProviderChannelService channels;
    private final CustomModelRegistrationMapper customMapper;
    private final ModelKeyMapper keyMapper;
    private final RoutingRuleMapper routingMapper;

    public ModelGovernanceCatalogService(ModelProviderChannelService channels,
                                         CustomModelRegistrationMapper customMapper,
                                         ModelKeyMapper keyMapper,
                                         RoutingRuleMapper routingMapper) {
        this.channels = channels;
        this.customMapper = customMapper;
        this.keyMapper = keyMapper;
        this.routingMapper = routingMapper;
    }

    @Override public PageResult<ModelProviderDTO> pageProviders(ModelDefinitionQueryRequest request) { return channels.pageProviders(request); }
    @Override public ModelProviderDTO createProvider(ModelProviderCreateRequest request) { return channels.createProvider(request); }
    @Override public ModelProviderDTO updateProvider(Long id, ModelProviderCreateRequest request) { return channels.updateProvider(id, request); }
    @Override public boolean deleteProvider(Long id) { return channels.deleteProvider(id); }
    @Override public PageResult<ModelChannelDTO> pageChannels(Long providerId, ModelDefinitionQueryRequest request) { return channels.pageChannels(providerId, request); }
    @Override public ModelChannelDTO createChannel(Long providerId, ModelChannelCreateRequest request) { return channels.createChannel(providerId, request); }
    @Override public ModelChannelDTO updateChannel(Long id, ModelChannelCreateRequest request) { return channels.updateChannel(id, request); }
    @Override public boolean deleteChannel(Long id) { return channels.deleteChannel(id); }

    public PageResult<CustomModelRegistrationDTO> pageCustom(ModelDefinitionQueryRequest request) {
        LambdaQueryWrapper<CustomModelRegistration> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(request.getKeyword())) wrapper.like(CustomModelRegistration::getModelCode, request.getKeyword());
        wrapper.orderByDesc(CustomModelRegistration::getId);
        IPage<CustomModelRegistration> page = customMapper.selectPage(new Page<>(request.resolvePageNum(), request.resolvePageSize()), wrapper);
        return PageResult.of(page.getRecords().stream().map(this::toDto).toList(), page.getTotal(), page.getCurrent(), page.getSize());
    }

    public CustomModelRegistrationDTO createCustom(CustomModelRegistrationCreateRequest request) {
        CustomModelRegistration entity = new CustomModelRegistration();
        entity.setModelCode(request.getModelCode());
        entity.setProviderId(request.getProviderId());
        entity.setVisibility(StringUtil.defaultIfBlank(request.getVisibility(), "TENANT"));
        entity.setApprovalStatus("PENDING");
        entity.setEndpoint(request.getEndpoint());
        entity.setKeyRef(request.getKeyRef());
        entity.setKeyFingerprint(request.getKeyFingerprint());
        entity.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        customMapper.insert(entity);
        return toDto(entity);
    }

    public CustomModelRegistrationDTO updateCustom(Long id, CustomModelRegistrationCreateRequest request) {
        CustomModelRegistration entity = customMapper.selectById(id);
        if (entity == null) throw new ResourceNotFoundException("CustomModelRegistration", id);
        entity.setModelCode(request.getModelCode());
        entity.setProviderId(request.getProviderId());
        entity.setVisibility(request.getVisibility());
        entity.setEndpoint(request.getEndpoint());
        entity.setKeyRef(request.getKeyRef());
        entity.setKeyFingerprint(request.getKeyFingerprint());
        if (request.getStatus() != null) entity.setStatus(request.getStatus());
        customMapper.updateById(entity);
        return toDto(entity);
    }

    public boolean deleteCustom(Long id) {
        if (customMapper.selectById(id) == null) throw new ResourceNotFoundException("CustomModelRegistration", id);
        return customMapper.deleteById(id) > 0;
    }

    public PageResult<ModelKeyDTO> pageKeys(ModelDefinitionQueryRequest request) {
        LambdaQueryWrapper<ModelKey> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(request.getKeyword())) wrapper.like(ModelKey::getKeyName, request.getKeyword());
        wrapper.orderByDesc(ModelKey::getId);
        IPage<ModelKey> page = keyMapper.selectPage(new Page<>(request.resolvePageNum(), request.resolvePageSize()), wrapper);
        return PageResult.of(page.getRecords().stream().map(this::toDto).toList(), page.getTotal(), page.getCurrent(), page.getSize());
    }

    public ModelKeyDTO createKey(ModelKeyCreateRequest request) {
        ModelKey entity = new ModelKey();
        entity.setKeyName(request.getKeyName());
        entity.setKeyRef(request.getKeyRef());
        entity.setKeyFingerprint(request.getKeyFingerprint());
        entity.setExpiresAt(request.getExpiresAt());
        entity.setStatus("ACTIVE");
        keyMapper.insert(entity);
        return toDto(entity);
    }

    public ModelKeyDTO rotateKey(Long id, ModelKeyCreateRequest request) {
        ModelKey entity = keyMapper.selectById(id);
        if (entity == null) throw new ResourceNotFoundException("ModelKey", id);
        entity.setKeyRef(request.getKeyRef());
        entity.setKeyFingerprint(request.getKeyFingerprint());
        entity.setExpiresAt(request.getExpiresAt());
        entity.setLastRotatedAt(LocalDateTime.now());
        entity.setStatus("ACTIVE");
        keyMapper.updateById(entity);
        return toDto(entity);
    }

    public ModelKeyDTO revokeKey(Long id) {
        ModelKey entity = keyMapper.selectById(id);
        if (entity == null) throw new ResourceNotFoundException("ModelKey", id);
        entity.setStatus("REVOKED");
        keyMapper.updateById(entity);
        return toDto(entity);
    }

    public PageResult<RoutingRuleDTO> pageRouting(ModelDefinitionQueryRequest request) {
        LambdaQueryWrapper<RoutingRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(request.getKeyword())) wrapper.like(RoutingRule::getRuleName, request.getKeyword());
        wrapper.orderByDesc(RoutingRule::getPriority).orderByDesc(RoutingRule::getId);
        IPage<RoutingRule> page = routingMapper.selectPage(new Page<>(request.resolvePageNum(), request.resolvePageSize()), wrapper);
        return PageResult.of(page.getRecords().stream().map(this::toDto).toList(), page.getTotal(), page.getCurrent(), page.getSize());
    }

    public RoutingRuleDTO createRouting(RoutingRuleCreateRequest request) {
        RoutingRule entity = new RoutingRule();
        entity.setRuleName(request.getRuleName());
        entity.setPrimaryModel(request.getPrimaryModel());
        entity.setFallbackModel(request.getFallbackModel());
        entity.setPriority(request.getPriority() == null ? 0 : request.getPriority());
        entity.setFallbackCondition(request.getFallbackCondition());
        entity.setCostOwner(request.getCostOwner());
        entity.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        routingMapper.insert(entity);
        return toDto(entity);
    }

    public RoutingRuleDTO updateRouting(Long id, RoutingRuleCreateRequest request) {
        RoutingRule entity = routingMapper.selectById(id);
        if (entity == null) throw new ResourceNotFoundException("RoutingRule", id);
        entity.setRuleName(request.getRuleName());
        entity.setPrimaryModel(request.getPrimaryModel());
        entity.setFallbackModel(request.getFallbackModel());
        entity.setPriority(request.getPriority());
        entity.setFallbackCondition(request.getFallbackCondition());
        entity.setCostOwner(request.getCostOwner());
        if (request.getStatus() != null) entity.setStatus(request.getStatus());
        routingMapper.updateById(entity);
        return toDto(entity);
    }

    public boolean deleteRouting(Long id) {
        if (routingMapper.selectById(id) == null) throw new ResourceNotFoundException("RoutingRule", id);
        return routingMapper.deleteById(id) > 0;
    }

    private CustomModelRegistrationDTO toDto(CustomModelRegistration entity) { CustomModelRegistrationDTO dto = new CustomModelRegistrationDTO(); dto.setId(entity.getId()); dto.setCreatedAt(entity.getCreatedAt()); dto.setUpdatedAt(entity.getUpdatedAt()); dto.setModelCode(entity.getModelCode()); dto.setProviderId(entity.getProviderId()); dto.setVisibility(entity.getVisibility()); dto.setApprovalStatus(entity.getApprovalStatus()); dto.setEndpoint(entity.getEndpoint()); dto.setKeyRef(entity.getKeyRef()); dto.setKeyFingerprint(entity.getKeyFingerprint()); dto.setStatus(entity.getStatus()); return dto; }
    private ModelKeyDTO toDto(ModelKey entity) { ModelKeyDTO dto = new ModelKeyDTO(); dto.setId(entity.getId()); dto.setCreatedAt(entity.getCreatedAt()); dto.setUpdatedAt(entity.getUpdatedAt()); dto.setKeyName(entity.getKeyName()); dto.setKeyRef(entity.getKeyRef()); dto.setKeyFingerprint(entity.getKeyFingerprint()); dto.setStatus(entity.getStatus()); dto.setExpiresAt(entity.getExpiresAt()); dto.setLastRotatedAt(entity.getLastRotatedAt()); return dto; }
    private RoutingRuleDTO toDto(RoutingRule entity) { RoutingRuleDTO dto = new RoutingRuleDTO(); dto.setId(entity.getId()); dto.setCreatedAt(entity.getCreatedAt()); dto.setUpdatedAt(entity.getUpdatedAt()); dto.setRuleName(entity.getRuleName()); dto.setPrimaryModel(entity.getPrimaryModel()); dto.setFallbackModel(entity.getFallbackModel()); dto.setPriority(entity.getPriority()); dto.setFallbackCondition(entity.getFallbackCondition()); dto.setCostOwner(entity.getCostOwner()); dto.setStatus(entity.getStatus()); return dto; }
}
