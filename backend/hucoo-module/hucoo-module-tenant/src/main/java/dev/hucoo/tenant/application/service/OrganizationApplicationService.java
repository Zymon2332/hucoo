package dev.hucoo.tenant.application.service;

import dev.hucoo.tenant.api.OrganizationFacade;
import dev.hucoo.tenant.api.dto.OrganizationCreateRequest;
import dev.hucoo.tenant.api.dto.OrganizationDTO;
import dev.hucoo.tenant.api.dto.OrganizationQueryRequest;
import dev.hucoo.tenant.application.converter.OrganizationConverter;
import dev.hucoo.tenant.domain.entity.Organization;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface OrganizationApplicationService extends IService<Organization>, OrganizationFacade {

    OrganizationConverter converter();

    @Override
    default PageResult<OrganizationDTO> pageDtos(OrganizationQueryRequest request) {
        Page<Organization> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default OrganizationDTO getDto(Long id) {
        Organization entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Organization", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default OrganizationDTO create(OrganizationCreateRequest request) {
        Organization entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default OrganizationDTO update(Long id, OrganizationCreateRequest request) {
        Organization entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Organization", id);
        }
        converter().update(request, entity);
        updateById(entity);
        return converter().toDto(entity);
    }

    @Override
    default boolean remove(Long id) {
        return removeById(id);
    }

    @Override
    default Class<Organization> getEntityClass() {
        return Organization.class;
    }
}
