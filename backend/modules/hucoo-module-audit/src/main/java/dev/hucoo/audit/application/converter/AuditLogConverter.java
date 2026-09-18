package dev.hucoo.audit.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.audit.api.dto.AuditLogCreateRequest;
import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.domain.entity.AuditLog;

@Mapper(componentModel = "spring")
public interface AuditLogConverter {

    AuditLogDTO toDto(AuditLog entity);

    List<AuditLogDTO> toDtoList(List<AuditLog> entities);

    AuditLog toEntity(AuditLogCreateRequest request);

    void update(AuditLogCreateRequest request, @MappingTarget AuditLog entity);
}
