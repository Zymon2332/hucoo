package dev.hucoo.toolmcp.api.dto;
import java.io.Serializable;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
@Data
public class ToolDefinitionCreateRequest implements Serializable {
    @NotBlank private String toolCode;
    @NotBlank private String toolName;
    private String parameterSchema;
    private String riskLevel;
    private Integer requiresApproval;
    private Integer status;
}
