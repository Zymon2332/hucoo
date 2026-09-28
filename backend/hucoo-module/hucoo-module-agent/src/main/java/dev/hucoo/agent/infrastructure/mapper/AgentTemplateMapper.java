package dev.hucoo.agent.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.agent.domain.entity.AgentTemplate;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface AgentTemplateMapper extends BaseMapper<AgentTemplate> {
}
