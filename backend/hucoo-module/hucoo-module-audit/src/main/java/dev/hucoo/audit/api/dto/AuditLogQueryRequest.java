package dev.hucoo.audit.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import dev.hucoo.commons.dto.PageQuery;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AuditLogQueryRequest extends PageQuery {

    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
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
