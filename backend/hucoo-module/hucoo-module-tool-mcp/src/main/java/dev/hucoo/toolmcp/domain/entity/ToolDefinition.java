package dev.hucoo.toolmcp.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_tool_definition")
public class ToolDefinition extends BaseEntity {
    @TableField("tool_code") private String toolCode;
    @TableField("tool_name") private String toolName;
    @TableField("parameter_schema") private String parameterSchema;
    @TableField("risk_level") private String riskLevel;
    @TableField("requires_approval") private Integer requiresApproval;
    @TableField("status") private Integer status;
}
