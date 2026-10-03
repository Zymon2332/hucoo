package dev.hucoo.admin.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.admin.job.AsyncJobRecord;

@Mapper
public interface AsyncJobRecordMapper extends BaseMapper<AsyncJobRecord> {
}
