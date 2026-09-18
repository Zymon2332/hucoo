package dev.hucoo.project.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.project.api.dto.ProjectWorkspaceCreateRequest;
import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.domain.entity.ProjectWorkspace;

@Mapper(componentModel = "spring")
public interface ProjectWorkspaceConverter {

    ProjectWorkspaceDTO toDto(ProjectWorkspace entity);

    List<ProjectWorkspaceDTO> toDtoList(List<ProjectWorkspace> entities);

    ProjectWorkspace toEntity(ProjectWorkspaceCreateRequest request);

    void update(ProjectWorkspaceCreateRequest request, @MappingTarget ProjectWorkspace entity);
}
