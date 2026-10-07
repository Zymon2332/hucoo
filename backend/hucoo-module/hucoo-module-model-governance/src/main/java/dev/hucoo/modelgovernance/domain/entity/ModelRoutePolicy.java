package dev.hucoo.modelgovernance.domain.entity;

import java.math.BigDecimal;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_route_policy", autoResultMap = true)
public class ModelRoutePolicy extends BaseEntity {
    /**
     * 旧版供应商编码，迁移完成后由模型和渠道映射替代
     */
    @TableField(value = "provider_code")
    private String providerCode;
    /**
     * 请求模型编码或逻辑模型编码
     */
    @TableField(value = "model_code")
    private String modelCode;
    /**
     * 路由范围类型：PLATFORM、TENANT、PROJECT、USER
     */
    @TableField(value = "scope_type")
    private String scopeType;
    /**
     * 路由范围对象 ID，平台范围使用空字符串
     */
    @TableField(value = "scope_id")
    private String scopeId;
    /**
     * 目标选择算法，例如加权随机或平滑加权轮询
     */
    @TableField(value = "selection_algorithm")
    private String selectionAlgorithm;
    /**
     * 一次请求允许的最大路由尝试次数
     */
    @TableField(value = "max_attempts")
    private Integer maxAttempts;
    /**
     * 连接超时时间，单位毫秒
     */
    @TableField(value = "connect_timeout_ms")
    private Long connectTimeoutMs;
    /**
     * 非流式响应超时时间，单位毫秒
     */
    @TableField(value = "response_timeout_ms")
    private Long responseTimeoutMs;
    /**
     * 流式响应空闲超时时间，单位毫秒
     */
    @TableField(value = "stream_idle_timeout_ms")
    private Long streamIdleTimeoutMs;
    /**
     * 触发熔断所需的连续失败次数
     */
    @TableField(value = "circuit_failure_threshold")
    private Integer circuitFailureThreshold;
    /**
     * 熔断失败统计窗口，单位秒
     */
    @TableField(value = "circuit_window_seconds")
    private Integer circuitWindowSeconds;
    /**
     * 熔断打开持续时间，单位秒
     */
    @TableField(value = "circuit_open_seconds")
    private Integer circuitOpenSeconds;
    /**
     * 可重试失败类别列表
     */
    @TableField(value = "retryable_failure_classes")
    private String retryableFailureClasses;
    /**
     * 降级模型链路配置
     */
    @TableField(value = "fallback_chain")
    private String fallbackChain;
    /**
     * 策略是否启用：1 启用，0 停用
     */
    @TableField(value = "enabled")
    private Integer enabled;
    /**
     * 路由策略关联的逻辑模型 ID
     */
    @TableField(value = "model_id")
    private Long modelId;
    /**
     * 路由策略锁定的模型版本 ID，可为空表示跟随已发布版本
     */
    @TableField(value = "model_version_id")
    private Long modelVersionId;
    /**
     * 该路由策略允许的成本上限
     */
    @TableField(value = "budget_limit")
    private BigDecimal budgetLimit;
    /**
     * 质量要求 JSON，例如能力、延迟和上下文长度要求
     */
    @TableField(value = "quality_requirement_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class)
    private String qualityRequirementJson;
}
