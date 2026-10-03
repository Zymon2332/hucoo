package dev.hucoo.modelgovernance.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.modelgovernance.domain.entity.ModelKey;

@Mapper
public interface ModelKeyMapper extends BaseMapper<ModelKey> {
}
