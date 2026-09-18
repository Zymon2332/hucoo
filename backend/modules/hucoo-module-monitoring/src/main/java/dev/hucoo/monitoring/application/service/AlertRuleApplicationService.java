package dev.hucoo.monitoring.application.service;

import java.util.Map;

import dev.hucoo.monitoring.api.AlertRuleFacade;
import dev.hucoo.monitoring.api.dto.AlertRuleCreateRequest;
import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.api.dto.AlertRuleQueryRequest;
import dev.hucoo.monitoring.application.converter.AlertRuleConverter;
import dev.hucoo.monitoring.domain.entity.AlertRule;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface AlertRuleApplicationService extends IService<AlertRule>, AlertRuleFacade {

    AlertRuleConverter converter();

    @Override
    default PageResult<AlertRuleDTO> pageDtos(AlertRuleQueryRequest request) {
        Page<AlertRule> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default AlertRuleDTO getDto(Long id) {
        AlertRule entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("AlertRule", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default AlertRuleDTO create(AlertRuleCreateRequest request) {
        AlertRule entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default AlertRuleDTO update(Long id, AlertRuleCreateRequest request) {
        AlertRule entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("AlertRule", id);
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
    default Class<AlertRule> getEntityClass() {
        return AlertRule.class;
    }
}
