package dev.hucoo.audit.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.audit.api.dto.AuditLogQueryRequest;
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
    public IPage<AuditLog> page(long pageNum, long pageSize, AuditLogQueryRequest request) {
        LambdaQueryWrapper<AuditLog> wrapper = new LambdaQueryWrapper<>();
        if (request.getOperatorId() != null) {
            wrapper.eq(AuditLog::getOperatorId, request.getOperatorId());
        }
        if (StringUtil.isNotBlank(request.getAction())) {
            wrapper.eq(AuditLog::getAction, request.getAction());
        }
        if (StringUtil.isNotBlank(request.getResourceType())) {
            wrapper.eq(AuditLog::getResourceType, request.getResourceType());
        }
        if (StringUtil.isNotBlank(request.getResourceId())) {
            wrapper.eq(AuditLog::getResourceId, request.getResourceId());
        }
        if (request.getResult() != null) {
            wrapper.eq(AuditLog::getResult, request.getResult());
        }
        if (request.getHttpStatus() != null) {
            wrapper.eq(AuditLog::getHttpStatus, request.getHttpStatus());
        }
        if (StringUtil.isNotBlank(request.getRequestMethod())) {
            wrapper.eq(AuditLog::getRequestMethod, request.getRequestMethod());
        }
        if (StringUtil.isNotBlank(request.getTraceId())) {
            wrapper.eq(AuditLog::getTraceId, request.getTraceId());
        }
        if (request.getStartTime() != null) {
            wrapper.ge(AuditLog::getCreatedAt, request.getStartTime());
        }
        if (request.getEndTime() != null) {
            wrapper.le(AuditLog::getCreatedAt, request.getEndTime());
        }
        if (StringUtil.isNotBlank(request.getKeyword())) {
            wrapper.and(query -> query.like(AuditLog::getOperatorName, request.getKeyword())
                    .or().like(AuditLog::getAction, request.getKeyword())
                    .or().like(AuditLog::getResourceId, request.getKeyword())
                    .or().like(AuditLog::getRequestUri, request.getKeyword()));
        }
        wrapper.orderByDesc(AuditLog::getCreatedAt);
        return auditLogMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return auditLogMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
