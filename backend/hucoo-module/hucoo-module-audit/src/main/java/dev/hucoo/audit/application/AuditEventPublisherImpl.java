package dev.hucoo.audit.application;

import org.springframework.stereotype.Component;

import dev.hucoo.audit.application.service.AuditLogApplicationService;
import dev.hucoo.audit.domain.entity.AuditLog;
import dev.hucoo.commons.api.AuditEventPublisher;
import dev.hucoo.commons.util.IdGenerator;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AuditEventPublisherImpl implements AuditEventPublisher {

    private final AuditLogApplicationService auditLogApplicationService;

    @Override
    public void publish(AuditEvent event) {
        AuditLog log = new AuditLog();
        log.setId(IdGenerator.nextId());
        log.setOperatorId(event.operatorId());
        log.setOperatorName(event.operatorName());
        log.setAction(event.action());
        log.setResourceType(event.resourceType());
        log.setResourceId(event.resourceId());
        log.setResult(event.result());
        log.setClientIp(event.clientIp());
        log.setTraceId(event.traceId());
        auditLogApplicationService.save(log);
    }
}
