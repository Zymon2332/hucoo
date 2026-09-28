package dev.hucoo.integration.application.service;

import java.util.Map;

import dev.hucoo.integration.api.IntegrationAppFacade;
import dev.hucoo.integration.api.dto.IntegrationAppCreateRequest;
import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.api.dto.IntegrationAppQueryRequest;
import dev.hucoo.integration.application.converter.IntegrationAppConverter;
import dev.hucoo.integration.domain.entity.IntegrationApp;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface IntegrationAppApplicationService extends IService<IntegrationApp>, IntegrationAppFacade {

    IntegrationAppConverter converter();

    @Override
    default PageResult<IntegrationAppDTO> pageDtos(IntegrationAppQueryRequest request) {
        Page<IntegrationApp> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default IntegrationAppDTO getDto(Long id) {
        IntegrationApp entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("IntegrationApp", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default IntegrationAppDTO create(IntegrationAppCreateRequest request) {
        IntegrationApp entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default IntegrationAppDTO update(Long id, IntegrationAppCreateRequest request) {
        IntegrationApp entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("IntegrationApp", id);
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
    default Class<IntegrationApp> getEntityClass() {
        return IntegrationApp.class;
    }
}
