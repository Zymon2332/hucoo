package dev.hucoo.modelgovernance.application.service;

import java.util.Map;

import dev.hucoo.modelgovernance.api.ModelDefinitionFacade;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.application.converter.ModelDefinitionConverter;
import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface ModelDefinitionApplicationService extends IService<ModelDefinition>, ModelDefinitionFacade {

    ModelDefinitionConverter converter();

    @Override
    default PageResult<ModelDefinitionDTO> pageDtos(ModelDefinitionQueryRequest request) {
        Page<ModelDefinition> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default ModelDefinitionDTO getDto(Long id) {
        ModelDefinition entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("ModelDefinition", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default ModelDefinitionDTO create(ModelDefinitionCreateRequest request) {
        ModelDefinition entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default ModelDefinitionDTO update(Long id, ModelDefinitionCreateRequest request) {
        ModelDefinition entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("ModelDefinition", id);
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
    default Class<ModelDefinition> getEntityClass() {
        return ModelDefinition.class;
    }
}
