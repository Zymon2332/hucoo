package dev.hucoo.modelgovernance.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.modelgovernance.api.dto.ModelDefinitionCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;

@Mapper(componentModel = "spring")
public interface ModelDefinitionConverter {

    ModelDefinitionDTO toDto(ModelDefinition entity);

    List<ModelDefinitionDTO> toDtoList(List<ModelDefinition> entities);

    ModelDefinition toEntity(ModelDefinitionCreateRequest request);

    void update(ModelDefinitionCreateRequest request, @MappingTarget ModelDefinition entity);
}
