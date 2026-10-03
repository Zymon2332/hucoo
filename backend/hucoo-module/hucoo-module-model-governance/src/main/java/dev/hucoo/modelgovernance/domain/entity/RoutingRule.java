package dev.hucoo.modelgovernance.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_routing_rule")
public class RoutingRule extends BaseEntity {
    @TableField("rule_name") private String ruleName;
    @TableField("primary_model") private String primaryModel;
    @TableField("fallback_model") private String fallbackModel;
    @TableField("priority") private Integer priority;
    @TableField("fallback_condition") private String fallbackCondition;
    @TableField("cost_owner") private String costOwner;
    @TableField("status") private Integer status;
}
