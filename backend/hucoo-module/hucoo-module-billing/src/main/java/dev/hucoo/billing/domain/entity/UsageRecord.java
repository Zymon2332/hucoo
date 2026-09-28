package dev.hucoo.billing.domain.entity;

import java.math.BigDecimal;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_usage_record")
public class UsageRecord extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("billing_tenant_id")
    private Long billingTenantId;

    @TableField("usage_type")
    private String usageType;

    @TableField("model_code")
    private String modelCode;

    @TableField("quantity")
    private Long quantity;

    @TableField("unit_price")
    private BigDecimal unitPrice;

    @TableField("amount")
    private BigDecimal amount;

    @TableField("period")
    private String period;

}
