package dev.hucoo.modelgovernance.domain.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 模型路由目标的供应商余额观测记录。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_balance_snapshot")
public class ModelBalanceSnapshot extends BaseEntity {

    /** 关联的路由目标 ID。 */
    @TableField("target_id")
    private Long targetId;

    /** 供应商编码。 */
    @TableField("provider_code")
    private String providerCode;

    /** 观测到的账户余额。 */
    @TableField("balance")
    private BigDecimal balance;

    /** 余额币种，例如 USD、CNY。 */
    @TableField("currency")
    private String currency;

    /** 余额状态：UNKNOWN、NORMAL、LOW、DEPLETED、ERROR。 */
    @TableField("balance_status")
    private String balanceStatus;

    /** 余额来源：MANUAL、PROVIDER_API、IMPORT。 */
    @TableField("source")
    private String source;

    /** 余额观测时间。 */
    @TableField("observed_at")
    private LocalDateTime observedAt;
}
