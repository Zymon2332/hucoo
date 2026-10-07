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
    /** 路由规则名称。 */
    @TableField("rule_name")
    private String ruleName;

    /** 首选模型编码。 */
    @TableField("primary_model")
    private String primaryModel;

    /** 首选模型不可用时的降级模型编码。 */
    @TableField("fallback_model")
    private String fallbackModel;

    /** 规则优先级，数值越小越优先。 */
    @TableField("priority")
    private Integer priority;

    /** 触发降级的条件表达式。 */
    @TableField("fallback_condition")
    private String fallbackCondition;

    /** 路由成本归属方。 */
    @TableField("cost_owner")
    private String costOwner;

    /** 规则启用状态：1 启用，0 停用。 */
    @TableField("status")
    private Integer status;
}
