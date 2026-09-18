package dev.hucoo.monitoring.domain.entity;

import java.math.BigDecimal;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_alert_rule")
public class AlertRule extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("rule_code")
    private String ruleCode;

    @TableField("rule_name")
    private String ruleName;

    @TableField("metric_name")
    private String metricName;

    @TableField("threshold_value")
    private BigDecimal thresholdValue;

    @TableField("alert_level")
    private String alertLevel;

    @TableField("notify_channel")
    private String notifyChannel;

    @TableField("enabled")
    private Integer enabled;

}
