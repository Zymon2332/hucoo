package dev.hucoo.audit.application;

import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;

import dev.hucoo.audit.api.OperationLogEvent;
import dev.hucoo.audit.api.OperationLogPublisher;
import dev.hucoo.audit.application.service.AuditLogApplicationService;
import dev.hucoo.audit.domain.entity.AuditLog;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.component.database.tenant.CurrentTenantContext;

import io.micrometer.core.instrument.MeterRegistry;
import dev.hucoo.component.log.context.TaskContext;

public class OperationLogPublisherImpl implements OperationLogPublisher {

    private static final Logger log = LoggerFactory.getLogger(OperationLogPublisherImpl.class);

    private final AuditLogApplicationService auditLogApplicationService;
    private final ThreadPoolExecutor executor;
    private final TaskContext taskContext;
    private final ObjectProvider<MeterRegistry> meterRegistry;

    public OperationLogPublisherImpl(AuditLogApplicationService auditLogApplicationService,
                                     ThreadPoolExecutor executor,
                                     ObjectProvider<MeterRegistry> meterRegistry, TaskContext taskContext) {
        this.auditLogApplicationService = auditLogApplicationService;
        this.executor = executor;
        this.taskContext = taskContext;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void publish(OperationLogEvent event) {
        try {
            executor.execute(taskContext.task("audit.persist", () -> persist(event)));
        } catch (RejectedExecutionException ex) {
            increment("audit.operation.log.dropped");
            log.warn("operation log queue is full, dropping event: action={}, uri={}",
                    event.action(), event.requestUri());
        }
    }

    private void persist(OperationLogEvent event) {
        String previousTenant = CurrentTenantContext.getTenantIdOrNull();
        try {
            CurrentTenantContext.set(event.tenantId());
            AuditLog logEntry = new AuditLog();
            logEntry.setId(IdGenerator.nextId());
            logEntry.setOperatorId(event.operatorId());
            logEntry.setOperatorName(event.operatorName());
            logEntry.setTenantId(event.tenantId());
            logEntry.setAction(event.action());
            logEntry.setResourceType(event.resourceType());
            logEntry.setResourceId(event.resourceId());
            logEntry.setResult(event.result());
            logEntry.setClientIp(event.clientIp());
            logEntry.setTraceId(event.traceId());
            logEntry.setRequestMethod(event.requestMethod());
            logEntry.setRequestUri(event.requestUri());
            logEntry.setOperationName(event.operationName());
            logEntry.setHttpStatus(event.httpStatus());
            logEntry.setDurationMs(event.durationMs());
            logEntry.setUserAgent(event.userAgent());
            auditLogApplicationService.save(logEntry);
            increment("audit.operation.log.persisted");
        } catch (Exception ex) {
            increment("audit.operation.log.failed");
            log.error("failed to persist operation log: action={}, uri={}", event.action(), event.requestUri(), ex);
        } finally {
            if (previousTenant == null) {
                CurrentTenantContext.clear();
            } else {
                CurrentTenantContext.set(previousTenant);
            }
        }
    }

    private void increment(String name) {
        MeterRegistry registry = meterRegistry.getIfAvailable();
        if (registry != null) {
            registry.counter(name).increment();
        }
    }
}
