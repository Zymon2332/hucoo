package dev.hucoo.project.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.project.api.dto.ProjectWorkspaceCreateRequest;
import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.api.dto.ProjectWorkspaceQueryRequest;

public interface ProjectWorkspaceFacade extends ModuleFacade {

    PageResult<ProjectWorkspaceDTO> pageDtos(ProjectWorkspaceQueryRequest request);

    ProjectWorkspaceDTO getDto(Long id);

    ProjectWorkspaceDTO create(ProjectWorkspaceCreateRequest request);

    ProjectWorkspaceDTO update(Long id, ProjectWorkspaceCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-project";
    }
}
