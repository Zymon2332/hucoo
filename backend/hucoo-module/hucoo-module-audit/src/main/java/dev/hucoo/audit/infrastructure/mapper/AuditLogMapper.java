package dev.hucoo.audit.infrastructure.mapper;

import java.util.Map;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.audit.domain.entity.AuditLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface AuditLogMapper extends BaseMapper<AuditLog> {

    Map<String, Object> selectStatistics();
}
