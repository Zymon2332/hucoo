package dev.hucoo.audit.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.audit.api.dto.AuditLogCreateRequest;
import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.api.dto.AuditLogQueryRequest;

public interface AuditLogFacade extends ModuleFacade {

    PageResult<AuditLogDTO> pageDtos(AuditLogQueryRequest request);

    AuditLogDTO getDto(Long id);

    AuditLogDTO create(AuditLogCreateRequest request);

    AuditLogDTO update(Long id, AuditLogCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-audit";
    }
}
