package dev.hucoo.agent.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.agent.api.dto.AgentTemplateCreateRequest;
import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.domain.entity.AgentTemplate;

@Mapper(componentModel = "spring")
public interface AgentTemplateConverter {

    AgentTemplateDTO toDto(AgentTemplate entity);

    List<AgentTemplateDTO> toDtoList(List<AgentTemplate> entities);

    AgentTemplate toEntity(AgentTemplateCreateRequest request);

    void update(AgentTemplateCreateRequest request, @MappingTarget AgentTemplate entity);
}
