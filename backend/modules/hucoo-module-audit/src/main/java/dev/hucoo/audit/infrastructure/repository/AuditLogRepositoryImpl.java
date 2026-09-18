package dev.hucoo.audit.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.audit.domain.entity.AuditLog;
import dev.hucoo.audit.infrastructure.mapper.AuditLogMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class AuditLogRepositoryImpl implements AuditLogRepository {

    private final AuditLogMapper auditLogMapper;

    public AuditLogRepositoryImpl(AuditLogMapper auditLogMapper) {
        this.auditLogMapper = auditLogMapper;
    }

    @Override
    public Optional<AuditLog> findById(Long id) {
        return Optional.ofNullable(auditLogMapper.selectById(id));
    }

    @Override
    public List<AuditLog> listAll() {
        return auditLogMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(AuditLog entity) {
        return auditLogMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(AuditLog entity) {
        return auditLogMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return auditLogMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<AuditLog> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<AuditLog> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(AuditLog::getOperatorName, keyword);
        }
        wrapper.orderByDesc(AuditLog::getOperatorName);
        return auditLogMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return auditLogMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
