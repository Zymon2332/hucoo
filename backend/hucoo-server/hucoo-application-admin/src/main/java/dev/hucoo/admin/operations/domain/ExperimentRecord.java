package dev.hucoo.admin.operations.domain;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_experiment")
public class ExperimentRecord extends BaseEntity {
    @TableField("experiment_key") private String experimentKey;
    @TableField("experiment_name") private String experimentName;
    @TableField("experiment_type") private String experimentType;
    @TableField("traffic_percent") private java.math.BigDecimal trafficPercent;
    @TableField("audience") private String audience;
    @TableField("metric") private String metric;
    @TableField("status") private String status;
}
