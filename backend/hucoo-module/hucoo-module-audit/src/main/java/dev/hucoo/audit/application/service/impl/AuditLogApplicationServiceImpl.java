package dev.hucoo.audit.application.service.impl;

import java.io.Serializable;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.api.dto.AuditLogQueryRequest;
import dev.hucoo.audit.application.converter.AuditLogConverter;
import dev.hucoo.audit.application.service.AuditLogApplicationService;
import dev.hucoo.audit.domain.entity.AuditLog;
import dev.hucoo.audit.infrastructure.mapper.AuditLogMapper;
import dev.hucoo.audit.infrastructure.repository.AuditLogRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class AuditLogApplicationServiceImpl extends ServiceImpl<AuditLogMapper, AuditLog>
        implements AuditLogApplicationService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogConverter auditLogConverter;

    public AuditLogApplicationServiceImpl(AuditLogRepository auditLogRepository,
                                          AuditLogConverter auditLogConverter) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogConverter = auditLogConverter;
    }

    @Override
    public AuditLogConverter converter() {
        return auditLogConverter;
    }

    @Override
    public PageResult<AuditLogDTO> pageDtos(AuditLogQueryRequest request) {
        IPage<AuditLog> page = auditLogRepository.page(request.resolvePageNum(), request.resolvePageSize(), request);
        return PageResult.of(page.getRecords().stream().map(auditLogConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public Map<String, Object> statistics() {
        return getBaseMapper().selectStatistics();
    }

    @Override
    public boolean updateById(AuditLog entity) {
        throw new UnsupportedOperationException("审计日志只允许追加写入");
    }

    @Override
    public boolean removeById(Serializable id) {
        throw new UnsupportedOperationException("审计日志只能由保留策略清理");
    }

}
