package dev.hucoo.toolmcp.api.dto;
import java.time.LocalDateTime;
import lombok.Data;
@Data
public class ToolDefinitionDTO {
    private Long id; private String toolCode; private String toolName; private String parameterSchema;
    private String riskLevel; private Integer requiresApproval; private Integer status;
    private LocalDateTime createdAt; private LocalDateTime updatedAt;
}
