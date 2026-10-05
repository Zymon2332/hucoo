package dev.hucoo.modelgovernance.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.modelgovernance.domain.entity.ModelChannel;

@Mapper
public interface ModelChannelMapper extends BaseMapper<ModelChannel> {
}
