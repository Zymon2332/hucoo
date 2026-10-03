package dev.hucoo.commons.api;

/** Public audit contract used by business modules without a dependency on the audit module. */
public interface AuditEventPublisher {

    void publish(AuditEvent event);

    record AuditEvent(Long operatorId,
                      String operatorName,
                      String tenantId,
                      String action,
                      String resourceType,
                      String resourceId,
                      int result,
                      String clientIp,
                      String traceId) {
    }
}
