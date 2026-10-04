package dev.hucoo.audit.api.dto;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import dev.hucoo.commons.dto.BaseDTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AuditLogDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long operatorId;
    private String operatorName;
    private String action;
    private String resourceType;
    private String resourceId;
    private Integer result;
    private String clientIp;
    private String traceId;
    private String requestMethod;
    private String requestUri;
    private String operationName;
    private Integer httpStatus;
    private Long durationMs;
    private String userAgent;
}
