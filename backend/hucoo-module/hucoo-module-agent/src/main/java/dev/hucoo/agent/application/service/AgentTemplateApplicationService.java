package dev.hucoo.agent.application.service;

import java.util.Map;

import dev.hucoo.agent.api.AgentTemplateFacade;
import dev.hucoo.agent.api.dto.AgentTemplateCreateRequest;
import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.api.dto.AgentTemplateQueryRequest;
import dev.hucoo.agent.application.converter.AgentTemplateConverter;
import dev.hucoo.agent.domain.entity.AgentTemplate;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface AgentTemplateApplicationService extends IService<AgentTemplate>, AgentTemplateFacade {

    AgentTemplateConverter converter();

    @Override
    default PageResult<AgentTemplateDTO> pageDtos(AgentTemplateQueryRequest request) {
        Page<AgentTemplate> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default AgentTemplateDTO getDto(Long id) {
        AgentTemplate entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("AgentTemplate", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default AgentTemplateDTO create(AgentTemplateCreateRequest request) {
        AgentTemplate entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default AgentTemplateDTO update(Long id, AgentTemplateCreateRequest request) {
        AgentTemplate entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("AgentTemplate", id);
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
    default Class<AgentTemplate> getEntityClass() {
        return AgentTemplate.class;
    }
}
