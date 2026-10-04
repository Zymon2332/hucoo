package dev.hucoo.toolmcp.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import lombok.Data;

@Data
public class ToolDefinitionDTO {

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String toolCode;
    private String toolName;
    private String parameterSchema;
    private String riskLevel;
    private Integer requiresApproval;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
