package dev.hucoo.modelgovernance.infrastructure.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.modelgovernance.domain.entity.ModelValidationCheck;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ModelValidationCheckMapper extends BaseMapper<ModelValidationCheck> {
}
