package dev.hucoo.audit.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.HashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.api.dto.AuditLogQueryRequest;
import dev.hucoo.audit.application.converter.AuditLogConverter;
import dev.hucoo.audit.application.service.AuditLogApplicationService;
import dev.hucoo.audit.domain.entity.AuditLog;
import dev.hucoo.audit.infrastructure.mapper.AuditLogMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockAuditLogApplicationService extends ServiceImpl<AuditLogMapper, AuditLog>
        implements AuditLogApplicationService {

    private final Map<Long, AuditLog> store = new ConcurrentHashMap<>();
    private final AuditLogConverter auditLogConverter;

    public MockAuditLogApplicationService(AuditLogConverter auditLogConverter) {
        this.auditLogConverter = auditLogConverter;
        seed();
    }

    @Override
    public AuditLogConverter converter() {
        return auditLogConverter;
    }

    private void seed() {
        AuditLog sample1 = new AuditLog();
        sample1.setId(IdGenerator.nextId());
        sample1.setOperatorId(1001L);
        sample1.setOperatorName("示例数据1");
        sample1.setAction("action-001");
        sample1.setResourceType("standard");
        sample1.setResourceId("resourceId-001");
        sample1.setResult(1);
        sample1.setClientIp("clientIp-001");
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        AuditLog sample2 = new AuditLog();
        sample2.setId(IdGenerator.nextId());
        sample2.setOperatorId(2001L);
        sample2.setOperatorName("示例数据2");
        sample2.setAction("action-002");
        sample2.setResourceType("standard");
        sample2.setResourceId("resourceId-002");
        sample2.setResult(2);
        sample2.setClientIp("clientIp-002");
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        AuditLog sample3 = new AuditLog();
        sample3.setId(IdGenerator.nextId());
        sample3.setOperatorId(3001L);
        sample3.setOperatorName("示例数据3");
        sample3.setAction("action-003");
        sample3.setResourceType("standard");
        sample3.setResourceId("resourceId-003");
        sample3.setResult(3);
        sample3.setClientIp("clientIp-003");
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<AuditLog> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public AuditLog getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(AuditLog entity) {
        if (entity.getId() == null) {
            entity.setId(IdGenerator.nextId());
        }
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setDeleted(0);
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean updateById(AuditLog entity) {
        throw new UnsupportedOperationException("审计日志只允许追加写入");
    }

    @Override
    public boolean removeById(Serializable id) {
        throw new UnsupportedOperationException("审计日志只能由保留策略清理");
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public <E extends IPage<AuditLog>> E page(E page) {
        List<AuditLog> all = list().stream()
                .sorted(Comparator.comparing(AuditLog::getId).reversed())
                .toList();
        long current = page.getCurrent();
        long size = page.getSize();
        int from = (int) Math.max(0L, (current - 1) * size);
        int to = (int) Math.min(all.size(), from + size);
        page.setTotal(all.size());
        page.setRecords(from >= all.size() ? List.of() : all.subList(from, to));
        return page;
    }

    @Override
    public PageResult<AuditLogDTO> pageDtos(AuditLogQueryRequest request) {
        List<AuditLog> all = list().stream()
                .filter(log -> matches(log, request))
                .sorted(Comparator.comparing(AuditLog::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        long current = request.resolvePageNum();
        long size = request.resolvePageSize();
        int from = (int) Math.min((current - 1) * size, all.size());
        int to = (int) Math.min(from + size, all.size());
        List<AuditLog> records = all.subList(from, to);
        return PageResult.of(records.stream().map(auditLogConverter::toDto).toList(),
                all.size(), current, size);
    }

    private boolean matches(AuditLog log, AuditLogQueryRequest request) {
        if (request.getOperatorId() != null && !request.getOperatorId().equals(log.getOperatorId())) {
            return false;
        }
        if (request.getResult() != null && !request.getResult().equals(log.getResult())) {
            return false;
        }
        if (request.getHttpStatus() != null && !request.getHttpStatus().equals(log.getHttpStatus())) {
            return false;
        }
        if (request.getAction() != null && !request.getAction().equals(log.getAction())) {
            return false;
        }
        if (request.getResourceType() != null && !request.getResourceType().equals(log.getResourceType())) {
            return false;
        }
        if (request.getResourceId() != null && !request.getResourceId().equals(log.getResourceId())) {
            return false;
        }
        if (request.getRequestMethod() != null && !request.getRequestMethod().equals(log.getRequestMethod())) {
            return false;
        }
        if (request.getTraceId() != null && !request.getTraceId().equals(log.getTraceId())) {
            return false;
        }
        if (request.getStartTime() != null && log.getCreatedAt() != null
                && log.getCreatedAt().isBefore(request.getStartTime())) {
            return false;
        }
        if (request.getEndTime() != null && log.getCreatedAt() != null
                && log.getCreatedAt().isAfter(request.getEndTime())) {
            return false;
        }
        String keyword = request.getKeyword();
        return keyword == null || keyword.isBlank()
                || contains(log.getOperatorName(), keyword)
                || contains(log.getAction(), keyword)
                || contains(log.getResourceId(), keyword)
                || contains(log.getRequestUri(), keyword);
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.contains(keyword);
    }

    @Override
    public Map<String, Object> statistics() {
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("total", store.size());
        statistics.put("mock", Boolean.TRUE);
        return statistics;
    }

}
