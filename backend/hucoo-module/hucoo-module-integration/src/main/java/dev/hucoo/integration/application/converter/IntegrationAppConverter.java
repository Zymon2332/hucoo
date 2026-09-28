package dev.hucoo.integration.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.integration.api.dto.IntegrationAppCreateRequest;
import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.domain.entity.IntegrationApp;

@Mapper(componentModel = "spring")
public interface IntegrationAppConverter {

    IntegrationAppDTO toDto(IntegrationApp entity);

    List<IntegrationAppDTO> toDtoList(List<IntegrationApp> entities);

    IntegrationApp toEntity(IntegrationAppCreateRequest request);

    void update(IntegrationAppCreateRequest request, @MappingTarget IntegrationApp entity);
}
