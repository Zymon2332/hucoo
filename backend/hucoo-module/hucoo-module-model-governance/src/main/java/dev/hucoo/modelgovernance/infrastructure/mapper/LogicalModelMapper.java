package dev.hucoo.modelgovernance.infrastructure.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.modelgovernance.domain.entity.LogicalModel;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LogicalModelMapper extends BaseMapper<LogicalModel> {
}
