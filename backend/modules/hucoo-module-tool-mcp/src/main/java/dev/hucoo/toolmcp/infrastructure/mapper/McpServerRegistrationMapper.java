package dev.hucoo.toolmcp.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface McpServerRegistrationMapper extends BaseMapper<McpServerRegistration> {
}
