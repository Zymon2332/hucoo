package dev.hucoo.modelgovernance.infrastructure.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.modelgovernance.domain.entity.ModelValidationRun;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ModelValidationRunMapper extends BaseMapper<ModelValidationRun> {
}
