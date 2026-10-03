package dev.hucoo.identity.application.service;

import java.util.List;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.identity.api.PermissionFacade;
import dev.hucoo.identity.api.dto.PermissionCreateRequest;
import dev.hucoo.identity.api.dto.PermissionDTO;
import dev.hucoo.identity.api.dto.PermissionMatrixRowDTO;
import dev.hucoo.identity.api.dto.PermissionQueryRequest;
import dev.hucoo.identity.application.converter.PermissionConverter;
import dev.hucoo.identity.domain.entity.Permission;

public interface PermissionApplicationService extends IService<Permission>, PermissionFacade {

    PermissionConverter converter();

    @Override
    default PageResult<PermissionDTO> pageDtos(PermissionQueryRequest request) {
        Page<Permission> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default PermissionDTO getDto(Long id) {
        Permission entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Permission", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default PermissionDTO create(PermissionCreateRequest request) {
        Permission entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default PermissionDTO update(Long id, PermissionCreateRequest request) {
        Permission entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Permission", id);
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
    default List<PermissionMatrixRowDTO> matrix(Long roleId) {
        return List.of();
    }

    @Override
    default boolean setRolePermission(Long roleId, Long permissionId, boolean granted) {
        return true;
    }

    @Override
    default Class<Permission> getEntityClass() {
        return Permission.class;
    }
}
