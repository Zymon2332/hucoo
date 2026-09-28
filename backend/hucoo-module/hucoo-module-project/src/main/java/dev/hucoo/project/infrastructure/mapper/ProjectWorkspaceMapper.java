package dev.hucoo.project.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.project.domain.entity.ProjectWorkspace;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface ProjectWorkspaceMapper extends BaseMapper<ProjectWorkspace> {
}
