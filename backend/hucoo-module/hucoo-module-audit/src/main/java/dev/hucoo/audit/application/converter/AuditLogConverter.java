package dev.hucoo.audit.application.converter;

import java.util.List;

import org.mapstruct.Mapper;

import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.domain.entity.AuditLog;

@Mapper(componentModel = "spring")
public interface AuditLogConverter {

    AuditLogDTO toDto(AuditLog entity);

    List<AuditLogDTO> toDtoList(List<AuditLog> entities);
}
