package dev.hucoo.toolmcp.application.service;

import java.util.Map;

import dev.hucoo.toolmcp.api.McpServerRegistrationFacade;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationCreateRequest;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationQueryRequest;
import dev.hucoo.toolmcp.application.converter.McpServerRegistrationConverter;
import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface McpServerRegistrationApplicationService extends IService<McpServerRegistration>, McpServerRegistrationFacade {

    McpServerRegistrationConverter converter();

    @Override
    default PageResult<McpServerRegistrationDTO> pageDtos(McpServerRegistrationQueryRequest request) {
        Page<McpServerRegistration> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default McpServerRegistrationDTO getDto(Long id) {
        McpServerRegistration entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("McpServerRegistration", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default McpServerRegistrationDTO create(McpServerRegistrationCreateRequest request) {
        McpServerRegistration entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default McpServerRegistrationDTO update(Long id, McpServerRegistrationCreateRequest request) {
        McpServerRegistration entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("McpServerRegistration", id);
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
    default Class<McpServerRegistration> getEntityClass() {
        return McpServerRegistration.class;
    }
}
