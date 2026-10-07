package dev.hucoo.modelgovernance.domain.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 路由目标的运行时健康、熔断和并发状态。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_account_runtime_state")
public class ModelAccountRuntimeState extends BaseEntity {

    /** 关联的路由目标 ID。 */
    @TableField("target_id")
    private Long targetId;

    /** 熔断状态：CLOSED、OPEN、HALF_OPEN。 */
    @TableField("circuit_state")
    private String circuitState;

    /** 根据健康度、余额和负载计算出的有效权重。 */
    @TableField("effective_weight")
    private BigDecimal effectiveWeight;

    /** 当前健康分，通常范围为 0 到 1。 */
    @TableField("health_score")
    private BigDecimal healthScore;

    /** 延迟指数加权移动平均值，单位毫秒。 */
    @TableField("latency_ewma")
    private BigDecimal latencyEwma;

    /** 滚动窗口请求总数。 */
    @TableField("rolling_request_count")
    private Long rollingRequestCount;

    /** 滚动窗口成功请求数。 */
    @TableField("rolling_success_count")
    private Long rollingSuccessCount;

    /** 滚动窗口失败请求数。 */
    @TableField("rolling_failure_count")
    private Long rollingFailureCount;

    /** 滚动窗口限流请求数。 */
    @TableField("rolling_rate_limit_count")
    private Long rollingRateLimitCount;

    /** 连续失败次数。 */
    @TableField("consecutive_failures")
    private Integer consecutiveFailures;

    /** 熔断冷却结束时间。 */
    @TableField("cooldown_until")
    private LocalDateTime cooldownUntil;

    /** 最近一次观测到的账户余额。 */
    @TableField("last_balance")
    private BigDecimal lastBalance;

    /** 最近一次余额检查时间。 */
    @TableField("last_balance_checked_at")
    private LocalDateTime lastBalanceCheckedAt;

    /** 运行时状态版本，用于并发更新。 */
    @TableField("state_version")
    private Long stateVersion;

    /** 最近一次失败类别。 */
    @TableField("last_error_class")
    private String lastErrorClass;

    /** 最近一次失败时间。 */
    @TableField("last_error_at")
    private LocalDateTime lastErrorAt;

    /** 当前进行中的请求数。 */
    @TableField("in_flight")
    private Integer inFlight;
}
