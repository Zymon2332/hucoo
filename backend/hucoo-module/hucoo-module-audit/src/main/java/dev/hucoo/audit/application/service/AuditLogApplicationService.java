package dev.hucoo.audit.application.service;

import java.util.Map;

import dev.hucoo.audit.api.AuditLogFacade;
import dev.hucoo.audit.api.dto.AuditLogCreateRequest;
import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.api.dto.AuditLogQueryRequest;
import dev.hucoo.audit.application.converter.AuditLogConverter;
import dev.hucoo.audit.domain.entity.AuditLog;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface AuditLogApplicationService extends IService<AuditLog>, AuditLogFacade {

    AuditLogConverter converter();

    @Override
    default PageResult<AuditLogDTO> pageDtos(AuditLogQueryRequest request) {
        Page<AuditLog> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default AuditLogDTO getDto(Long id) {
        AuditLog entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("AuditLog", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default AuditLogDTO create(AuditLogCreateRequest request) {
        AuditLog entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default AuditLogDTO update(Long id, AuditLogCreateRequest request) {
        AuditLog entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("AuditLog", id);
        }
        converter().update(request, entity);
        updateById(entity);
        return converter().toDto(entity);
    }

    @Override
    default boolean remove(Long id) {
        return removeById(id);
    }

    Map<String, Object> statistics();

    @Override
    default Class<AuditLog> getEntityClass() {
        return AuditLog.class;
    }
}
