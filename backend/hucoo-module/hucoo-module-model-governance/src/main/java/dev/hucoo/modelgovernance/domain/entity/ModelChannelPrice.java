package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;
import java.math.BigDecimal;

import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_channel_price", autoResultMap = true)
public class ModelChannelPrice extends BaseEntity {
    /**
     * 关联的模型渠道映射 ID
     */
    @TableField(value = "binding_id")
    private Long bindingId;

    /**
     * 计费维度：INPUT_TOKEN、OUTPUT_TOKEN、CACHE_READ_TOKEN、CACHE_WRITE_TOKEN、REQUEST
     */
    @TableField(value = "billing_dimension")
    private String billingDimension;

    /**
     * 价格阶梯起始数量，包含该值
     */
    @TableField(value = "tier_start")
    private Long tierStart;

    /**
     * 价格阶梯结束数量，包含该值，空值表示无上限
     */
    @TableField(value = "tier_end", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long tierEnd;

    /**
     * 单价数值，按 unit_scale 换算
     */
    @TableField(value = "unit_price")
    private BigDecimal unitPrice;

    /**
     * 价格单位缩放因子，默认按百万单位换算
     */
    @TableField(value = "unit_scale")
    private Long unitScale;

    /**
     * 价格币种，例如 USD、CNY
     */
    @TableField(value = "currency")
    private String currency;

    /**
     * 价格生效时间
     */
    @TableField(value = "effective_from")
    private LocalDateTime effectiveFrom;

    /**
     * 价格失效时间，空值表示当前有效
     */
    @TableField(value = "effective_to", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime effectiveTo;

}
