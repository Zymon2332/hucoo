package dev.hucoo.tenant.application.service;

import java.util.Map;

import dev.hucoo.tenant.api.TenantFacade;
import dev.hucoo.tenant.api.dto.TenantCreateRequest;
import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.api.dto.TenantQueryRequest;
import dev.hucoo.tenant.application.converter.TenantConverter;
import dev.hucoo.tenant.domain.entity.Tenant;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface TenantApplicationService extends IService<Tenant>, TenantFacade {

    TenantConverter converter();

    @Override
    default PageResult<TenantDTO> pageDtos(TenantQueryRequest request) {
        Page<Tenant> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default TenantDTO getDto(Long id) {
        Tenant entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Tenant", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default TenantDTO create(TenantCreateRequest request) {
        Tenant entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default TenantDTO update(Long id, TenantCreateRequest request) {
        Tenant entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Tenant", id);
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
    default Class<Tenant> getEntityClass() {
        return Tenant.class;
    }
}
