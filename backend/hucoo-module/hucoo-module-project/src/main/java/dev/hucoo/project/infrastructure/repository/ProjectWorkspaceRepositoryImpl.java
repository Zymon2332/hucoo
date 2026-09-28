package dev.hucoo.project.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.project.domain.entity.ProjectWorkspace;
import dev.hucoo.project.infrastructure.mapper.ProjectWorkspaceMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class ProjectWorkspaceRepositoryImpl implements ProjectWorkspaceRepository {

    private final ProjectWorkspaceMapper projectWorkspaceMapper;

    public ProjectWorkspaceRepositoryImpl(ProjectWorkspaceMapper projectWorkspaceMapper) {
        this.projectWorkspaceMapper = projectWorkspaceMapper;
    }

    @Override
    public Optional<ProjectWorkspace> findById(Long id) {
        return Optional.ofNullable(projectWorkspaceMapper.selectById(id));
    }

    @Override
    public List<ProjectWorkspace> listAll() {
        return projectWorkspaceMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(ProjectWorkspace entity) {
        return projectWorkspaceMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(ProjectWorkspace entity) {
        return projectWorkspaceMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return projectWorkspaceMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<ProjectWorkspace> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<ProjectWorkspace> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(ProjectWorkspace::getProjectCode, keyword);
        }
        wrapper.orderByDesc(ProjectWorkspace::getProjectCode);
        return projectWorkspaceMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return projectWorkspaceMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
