package dev.hucoo.billing.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.billing.domain.entity.UsageRecord;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface UsageRecordMapper extends BaseMapper<UsageRecord> {
}
