package dev.hucoo.modelgovernance.application.converter;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.domain.entity.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface ModelCatalogConverter {
    ModelRouteTargetDTO toDto(ModelRouteTarget entity);
    ModelRouteTarget toEntity(ModelRouteTargetCreateRequest request);
    ModelRoutePolicyDTO toDto(ModelRoutePolicy entity);
    ModelRoutePolicy toEntity(ModelRoutePolicyCreateRequest request);
    ModelChannelDTO toDto(ModelChannel entity);
    ModelChannel toEntity(ModelChannelCreateRequest request);
    void update(ModelChannelCreateRequest request, @MappingTarget ModelChannel entity);
    ModelProviderDTO toDto(ModelProvider entity);
    ModelProvider toEntity(ModelProviderCreateRequest request);
    void update(ModelProviderCreateRequest request, @MappingTarget ModelProvider entity);
    LogicalModelDTO toDto(LogicalModel entity);
    LogicalModel toEntity(LogicalModelCreateRequest request);
    void update(LogicalModelCreateRequest request, @MappingTarget LogicalModel entity);
    ModelVersionDTO toDto(ModelVersion entity);
    ModelVersion toEntity(ModelVersionCreateRequest request);
    void update(ModelVersionCreateRequest request, @MappingTarget ModelVersion entity);
    ModelChannelBindingDTO toDto(ModelChannelBinding entity);
    ModelChannelBinding toEntity(ModelChannelBindingCreateRequest request);
    void update(ModelChannelBindingCreateRequest request, @MappingTarget ModelChannelBinding entity);
    ModelVersionCapabilityDTO toDto(ModelVersionCapability entity);
    ModelVersionCapability toEntity(ModelVersionCapabilityCreateRequest request);
    void update(ModelVersionCapabilityCreateRequest request, @MappingTarget ModelVersionCapability entity);
    ModelChannelPriceDTO toDto(ModelChannelPrice entity);
    ModelChannelPrice toEntity(ModelChannelPriceCreateRequest request);
    void update(ModelChannelPriceCreateRequest request, @MappingTarget ModelChannelPrice entity);
    ModelVisibilityGrantDTO toDto(ModelVisibilityGrant entity);
    ModelVisibilityGrant toEntity(ModelVisibilityGrantCreateRequest request);
    void update(ModelVisibilityGrantCreateRequest request, @MappingTarget ModelVisibilityGrant entity);
    ModelCredentialDTO toDto(ModelCredential entity);
}
