package dev.hucoo.project.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.project.domain.entity.ProjectWorkspace;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface ProjectWorkspaceRepository {

    Optional<ProjectWorkspace> findById(Long id);

    List<ProjectWorkspace> listAll();

    boolean save(ProjectWorkspace entity);

    boolean updateById(ProjectWorkspace entity);

    boolean removeById(Long id);

    IPage<ProjectWorkspace> page(long pageNum, long pageSize, String keyword);

    long count();
}
