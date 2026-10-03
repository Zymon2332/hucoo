package dev.hucoo.audit.api;

public record OperationLogEvent(Long operatorId,
                                String operatorName,
                                String tenantId,
                                String action,
                                String resourceType,
                                String resourceId,
                                int result,
                                String clientIp,
                                String traceId,
                                String requestMethod,
                                String requestUri,
                                String operationName,
                                int httpStatus,
                                long durationMs,
                                String userAgent) {
}
