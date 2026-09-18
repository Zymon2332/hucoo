package dev.hucoo.project.application.service;

import java.util.Map;

import dev.hucoo.project.api.ProjectWorkspaceFacade;
import dev.hucoo.project.api.dto.ProjectWorkspaceCreateRequest;
import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.api.dto.ProjectWorkspaceQueryRequest;
import dev.hucoo.project.application.converter.ProjectWorkspaceConverter;
import dev.hucoo.project.domain.entity.ProjectWorkspace;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface ProjectWorkspaceApplicationService extends IService<ProjectWorkspace>, ProjectWorkspaceFacade {

    ProjectWorkspaceConverter converter();

    @Override
    default PageResult<ProjectWorkspaceDTO> pageDtos(ProjectWorkspaceQueryRequest request) {
        Page<ProjectWorkspace> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default ProjectWorkspaceDTO getDto(Long id) {
        ProjectWorkspace entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("ProjectWorkspace", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default ProjectWorkspaceDTO create(ProjectWorkspaceCreateRequest request) {
        ProjectWorkspace entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default ProjectWorkspaceDTO update(Long id, ProjectWorkspaceCreateRequest request) {
        ProjectWorkspace entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("ProjectWorkspace", id);
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
    default Class<ProjectWorkspace> getEntityClass() {
        return ProjectWorkspace.class;
    }
}
