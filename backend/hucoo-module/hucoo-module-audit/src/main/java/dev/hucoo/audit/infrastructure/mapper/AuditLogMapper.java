package dev.hucoo.audit.infrastructure.mapper;

import java.util.Map;
import java.time.LocalDateTime;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.audit.domain.entity.AuditLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.annotation.InterceptorIgnore;

@Mapper
public interface AuditLogMapper extends BaseMapper<AuditLog> {

    Map<String, Object> selectStatistics();

    @InterceptorIgnore(tenantLine = "true")
    int deleteBefore(LocalDateTime cutoff, int limit);
}
