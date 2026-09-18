package dev.hucoo.monitoring.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.monitoring.domain.entity.AlertRule;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface AlertRuleMapper extends BaseMapper<AlertRule> {
}
