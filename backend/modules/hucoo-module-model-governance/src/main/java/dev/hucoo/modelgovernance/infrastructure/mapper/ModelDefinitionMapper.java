package dev.hucoo.modelgovernance.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface ModelDefinitionMapper extends BaseMapper<ModelDefinition> {
}
