package dev.hucoo.audit.api.dto;

import dev.hucoo.commons.dto.PageQuery;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AuditLogQueryRequest extends PageQuery {

    private static final long serialVersionUID = 1L;

    private Long operatorId;
    private String action;
    private String resourceType;
    private String resourceId;
    private Integer result;
    private Integer httpStatus;
    private String requestMethod;
    private String traceId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
