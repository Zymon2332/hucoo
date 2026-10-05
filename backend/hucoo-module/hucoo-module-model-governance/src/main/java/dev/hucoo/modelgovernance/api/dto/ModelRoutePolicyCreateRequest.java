package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ModelRoutePolicyCreateRequest implements Serializable {
    @io.swagger.v3.oas.annotations.media.Schema(description = "路由范围类型：PLATFORM、TENANT、PROJECT、USER")
    private String scopeType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "路由范围对象 ID，平台范围使用空字符串")
    private String scopeId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标选择算法，例如加权随机或平滑加权轮询")
    private String selectionAlgorithm;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "一次请求允许的最大路由尝试次数")
    private Integer maxAttempts;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "连接超时时间，单位毫秒")
    private Long connectTimeoutMs;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "非流式响应超时时间，单位毫秒")
    private Long responseTimeoutMs;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "流式响应空闲超时时间，单位毫秒")
    private Long streamIdleTimeoutMs;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "触发熔断所需的连续失败次数")
    private Integer circuitFailureThreshold;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "熔断失败统计窗口，单位秒")
    private Integer circuitWindowSeconds;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "熔断打开持续时间，单位秒")
    private Integer circuitOpenSeconds;
    @io.swagger.v3.oas.annotations.media.Schema(description = "可重试失败类别列表")
    private String retryableFailureClasses;
    @io.swagger.v3.oas.annotations.media.Schema(description = "降级模型链路配置")
    private String fallbackChain;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "策略是否启用：1 启用，0 停用")
    private Integer enabled;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "路由策略锁定的模型版本 ID，可为空表示跟随已发布版本")
    private Long modelVersionId;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "该路由策略允许的成本上限")
    private BigDecimal budgetLimit;
    @io.swagger.v3.oas.annotations.media.Schema(description = "质量要求 JSON，例如能力、延迟和上下文长度要求")
    private String qualityRequirementJson;
}
