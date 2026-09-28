package dev.hucoo.project.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.api.dto.ProjectWorkspaceQueryRequest;
import dev.hucoo.project.application.converter.ProjectWorkspaceConverter;
import dev.hucoo.project.application.service.ProjectWorkspaceApplicationService;
import dev.hucoo.project.domain.entity.ProjectWorkspace;
import dev.hucoo.project.infrastructure.mapper.ProjectWorkspaceMapper;
import dev.hucoo.project.infrastructure.repository.ProjectWorkspaceRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class ProjectWorkspaceApplicationServiceImpl extends ServiceImpl<ProjectWorkspaceMapper, ProjectWorkspace>
        implements ProjectWorkspaceApplicationService {

    private final ProjectWorkspaceRepository projectWorkspaceRepository;
    private final ProjectWorkspaceConverter projectWorkspaceConverter;

    public ProjectWorkspaceApplicationServiceImpl(ProjectWorkspaceRepository projectWorkspaceRepository,
                                          ProjectWorkspaceConverter projectWorkspaceConverter) {
        this.projectWorkspaceRepository = projectWorkspaceRepository;
        this.projectWorkspaceConverter = projectWorkspaceConverter;
    }

    @Override
    public ProjectWorkspaceConverter converter() {
        return projectWorkspaceConverter;
    }

    @Override
    public PageResult<ProjectWorkspaceDTO> pageDtos(ProjectWorkspaceQueryRequest request) {
        IPage<ProjectWorkspace> page = projectWorkspaceRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(projectWorkspaceConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
