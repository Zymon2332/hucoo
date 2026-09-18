package dev.hucoo.security.application.service;

import java.util.Map;

import dev.hucoo.security.api.SecurityPolicyFacade;
import dev.hucoo.security.api.dto.SecurityPolicyCreateRequest;
import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.api.dto.SecurityPolicyQueryRequest;
import dev.hucoo.security.application.converter.SecurityPolicyConverter;
import dev.hucoo.security.domain.entity.SecurityPolicy;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface SecurityPolicyApplicationService extends IService<SecurityPolicy>, SecurityPolicyFacade {

    SecurityPolicyConverter converter();

    @Override
    default PageResult<SecurityPolicyDTO> pageDtos(SecurityPolicyQueryRequest request) {
        Page<SecurityPolicy> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default SecurityPolicyDTO getDto(Long id) {
        SecurityPolicy entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("SecurityPolicy", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default SecurityPolicyDTO create(SecurityPolicyCreateRequest request) {
        SecurityPolicy entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default SecurityPolicyDTO update(Long id, SecurityPolicyCreateRequest request) {
        SecurityPolicy entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("SecurityPolicy", id);
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
    default Class<SecurityPolicy> getEntityClass() {
        return SecurityPolicy.class;
    }
}
