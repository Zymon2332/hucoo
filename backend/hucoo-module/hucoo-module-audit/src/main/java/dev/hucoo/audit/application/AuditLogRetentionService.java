package dev.hucoo.audit.application;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

import dev.hucoo.audit.config.OperationLogProperties;
import dev.hucoo.audit.infrastructure.mapper.AuditLogMapper;

public class AuditLogRetentionService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogRetentionService.class);
    private static final int BATCH_SIZE = 1_000;

    private final AuditLogMapper auditLogMapper;
    private final OperationLogProperties properties;

    public AuditLogRetentionService(AuditLogMapper auditLogMapper, OperationLogProperties properties) {
        this.auditLogMapper = auditLogMapper;
        this.properties = properties;
    }

    @Scheduled(cron = "${agent-platform.modules.audit.operation-log.retention-cron:0 0 3 * * *}")
    public void purgeExpiredLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(properties.getRetentionDays());
        int deleted;
        int total = 0;
        do {
            deleted = auditLogMapper.deleteBefore(cutoff, BATCH_SIZE);
            total += deleted;
        } while (deleted == BATCH_SIZE);
        if (total > 0) {
            log.info("purged expired audit logs: count={}, cutoff={}", total, cutoff);
        }
    }
}
