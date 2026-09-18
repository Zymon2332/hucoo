package dev.hucoo.audit.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.audit.domain.entity.AuditLog;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface AuditLogRepository {

    Optional<AuditLog> findById(Long id);

    List<AuditLog> listAll();

    boolean save(AuditLog entity);

    boolean updateById(AuditLog entity);

    boolean removeById(Long id);

    IPage<AuditLog> page(long pageNum, long pageSize, String keyword);

    long count();
}
