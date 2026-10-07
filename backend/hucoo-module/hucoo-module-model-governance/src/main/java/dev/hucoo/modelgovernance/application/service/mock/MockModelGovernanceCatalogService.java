package dev.hucoo.modelgovernance.application.service.mock;

import java.time.LocalDateTime;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
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
import dev.hucoo.modelgovernance.application.service.ModelGovernanceCatalogFacade;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockModelGovernanceCatalogService implements ModelGovernanceCatalogFacade {

    private final dev.hucoo.modelgovernance.application.service.ModelProviderChannelService channels;

    public MockModelGovernanceCatalogService(dev.hucoo.modelgovernance.application.service.ModelProviderChannelService channels) {
        this.channels = channels;
    }

    @Override
    public PageResult<CustomModelRegistrationDTO> pageCustom(ModelDefinitionQueryRequest request) {
        return PageResult.empty(request.resolvePageNum(), request.resolvePageSize());
    }

    @Override
    public PageResult<ModelKeyDTO> pageKeys(ModelDefinitionQueryRequest request) {
        return PageResult.empty(request.resolvePageNum(), request.resolvePageSize());
    }

    @Override
    public PageResult<RoutingRuleDTO> pageRouting(ModelDefinitionQueryRequest request) {
        return PageResult.empty(request.resolvePageNum(), request.resolvePageSize());
    }

    @Override
    public PageResult<ModelProviderDTO> pageProviders(ModelDefinitionQueryRequest request) {
        return channels.pageProviders(request);
    }

    @Override
    public ModelProviderDTO createProvider(ModelProviderCreateRequest request) {
        return channels.createProvider(request);
    }

    @Override
    public ModelProviderDTO updateProvider(Long id, ModelProviderCreateRequest request) {
        return channels.updateProvider(id, request);
    }

    @Override
    public boolean deleteProvider(Long id) {
        return channels.deleteProvider(id);
    }

    @Override
    public PageResult<ModelChannelDTO> pageChannels(Long providerId, ModelDefinitionQueryRequest request) {
        return channels.pageChannels(providerId, request);
    }

    @Override
    public ModelChannelDTO createChannel(Long providerId, ModelChannelCreateRequest request) {
        return channels.createChannel(providerId, request);
    }

    @Override
    public ModelChannelDTO updateChannel(Long id, ModelChannelCreateRequest request) {
        return channels.updateChannel(id, request);
    }

    @Override
    public boolean deleteChannel(Long id) {
        return channels.deleteChannel(id);
    }

    @Override
    public CustomModelRegistrationDTO createCustom(CustomModelRegistrationCreateRequest request) {
        CustomModelRegistrationDTO dto = new CustomModelRegistrationDTO();
        dto.setId(IdGenerator.nextId());
        dto.setModelCode(request.getModelCode());
        dto.setProviderId(request.getProviderId());
        dto.setVisibility(request.getVisibility());
        dto.setApprovalStatus("PENDING");
        dto.setEndpoint(request.getEndpoint());
        dto.setKeyRef(request.getKeyRef());
        dto.setKeyFingerprint(request.getKeyFingerprint());
        dto.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        stamp(dto);
        return dto;
    }

    @Override
    public CustomModelRegistrationDTO updateCustom(Long id, CustomModelRegistrationCreateRequest request) {
        CustomModelRegistrationDTO dto = createCustom(request);
        dto.setId(id);
        return dto;
    }

    @Override
    public boolean deleteCustom(Long id) {
        return true;
    }

    @Override
    public ModelKeyDTO createKey(ModelKeyCreateRequest request) {
        ModelKeyDTO dto = new ModelKeyDTO();
        dto.setId(IdGenerator.nextId());
        dto.setKeyName(request.getKeyName());
        dto.setKeyRef(request.getKeyRef());
        dto.setKeyFingerprint(request.getKeyFingerprint());
        dto.setExpiresAt(request.getExpiresAt());
        dto.setStatus("ACTIVE");
        stamp(dto);
        return dto;
    }

    @Override
    public ModelKeyDTO rotateKey(Long id, ModelKeyCreateRequest request) {
        ModelKeyDTO dto = createKey(request);
        dto.setId(id);
        dto.setLastRotatedAt(LocalDateTime.now());
        return dto;
    }

    @Override
    public ModelKeyDTO revokeKey(Long id) {
        ModelKeyDTO dto = new ModelKeyDTO();
        dto.setId(id);
        dto.setStatus("REVOKED");
        stamp(dto);
        return dto;
    }

    @Override
    public RoutingRuleDTO createRouting(RoutingRuleCreateRequest request) {
        RoutingRuleDTO dto = new RoutingRuleDTO();
        dto.setId(IdGenerator.nextId());
        dto.setRuleName(request.getRuleName());
        dto.setPrimaryModel(request.getPrimaryModel());
        dto.setFallbackModel(request.getFallbackModel());
        dto.setPriority(request.getPriority());
        dto.setFallbackCondition(request.getFallbackCondition());
        dto.setCostOwner(request.getCostOwner());
        dto.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        stamp(dto);
        return dto;
    }

    @Override
    public RoutingRuleDTO updateRouting(Long id, RoutingRuleCreateRequest request) {
        RoutingRuleDTO dto = createRouting(request);
        dto.setId(id);
        return dto;
    }

    @Override
    public boolean deleteRouting(Long id) {
        return true;
    }

    private void stamp(dev.hucoo.commons.dto.BaseDTO dto) {
        dto.setCreatedAt(LocalDateTime.now());
        dto.setUpdatedAt(LocalDateTime.now());
    }
}
