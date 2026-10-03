package dev.hucoo.identity.application.service;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.identity.api.RoleFacade;
import dev.hucoo.identity.api.dto.RoleCreateRequest;
import dev.hucoo.identity.api.dto.RoleDTO;
import dev.hucoo.identity.api.dto.RoleQueryRequest;
import dev.hucoo.identity.application.converter.RoleConverter;
import dev.hucoo.identity.domain.entity.Role;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface RoleApplicationService extends IService<Role>, RoleFacade {

    RoleConverter converter();

    @Override
    default PageResult<RoleDTO> pageDtos(RoleQueryRequest request) {
        Page<Role> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default RoleDTO getDto(Long id) {
        Role entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Role", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default RoleDTO create(RoleCreateRequest request) {
        Role entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default RoleDTO update(Long id, RoleCreateRequest request) {
        Role entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("Role", id);
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
    default Class<Role> getEntityClass() {
        return Role.class;
    }
}
