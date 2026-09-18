package dev.hucoo.toolmcp.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.toolmcp.api.dto.McpServerRegistrationCreateRequest;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;

@Mapper(componentModel = "spring")
public interface McpServerRegistrationConverter {

    McpServerRegistrationDTO toDto(McpServerRegistration entity);

    List<McpServerRegistrationDTO> toDtoList(List<McpServerRegistration> entities);

    McpServerRegistration toEntity(McpServerRegistrationCreateRequest request);

    void update(McpServerRegistrationCreateRequest request, @MappingTarget McpServerRegistration entity);
}
