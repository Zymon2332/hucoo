package dev.hucoo.modelgovernance.domain.entity;

import java.math.BigDecimal;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 模型调用审计和计量记录。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_invocation")
public class ModelInvocation extends BaseEntity {

    /** 调用请求 ID。 */
    @TableField("request_id")
    private String requestId;

    /** 链路追踪 ID。 */
    @TableField("trace_id")
    private String traceId;

    /** 发起调用的项目 ID。 */
    @TableField("project_id")
    private Long projectId;

    /** 请求方传入的模型编码。 */
    @TableField("requested_model")
    private String requestedModel;

    /** 路由后实际使用的模型编码。 */
    @TableField("effective_model")
    private String effectiveModel;

    /** 实际调用的供应商编码。 */
    @TableField("provider_code")
    private String providerCode;

    /** 实际选中的路由目标 ID。 */
    @TableField("target_id")
    private Long targetId;

    /** 实际使用凭证的指纹，不保存凭证明文。 */
    @TableField("key_fingerprint")
    private String keyFingerprint;

    /** 本次请求的路由尝试序号。 */
    @TableField("attempt_no")
    private Integer attemptNo;

    /** 是否为流式请求：1 是，0 否。 */
    @TableField("stream")
    private Integer stream;

    /** 调用结果状态。 */
    @TableField("status")
    private String status;

    /** 失败类别。 */
    @TableField("failure_class")
    private String failureClass;

    /** 触发降级的原因。 */
    @TableField("fallback_reason")
    private String fallbackReason;

    /** 输入 Token 数。 */
    @TableField("input_tokens")
    private Long inputTokens;

    /** 输出 Token 数。 */
    @TableField("output_tokens")
    private Long outputTokens;

    /** 输入和输出 Token 总数。 */
    @TableField("total_tokens")
    private Long totalTokens;

    /** 调用耗时，单位毫秒。 */
    @TableField("latency_ms")
    private Long latencyMs;

    /** 本次调用成本金额。 */
    @TableField("amount")
    private BigDecimal amount;

    /** 请求内容哈希，用于去重和审计关联。 */
    @TableField("request_hash")
    private String requestHash;

    /** 请求解析出的逻辑模型 ID。 */
    @TableField("model_id")
    private Long modelId;

    /** 实际调用的模型版本 ID。 */
    @TableField("model_version_id")
    private Long modelVersionId;

    /** 实际调用的供应商渠道 ID。 */
    @TableField("channel_id")
    private Long channelId;

    /** 实际使用的模型渠道映射 ID。 */
    @TableField("binding_id")
    private Long bindingId;

    /** 实际命中的路由策略 ID。 */
    @TableField("route_policy_id")
    private Long routePolicyId;

    /** 实际选中的路由目标 ID，和旧 target_id 并存兼容。 */
    @TableField("route_target_id")
    private Long routeTargetId;

    /** 实际使用的凭证 ID。 */
    @TableField("credential_id")
    private Long credentialId;

    /** 发起模型调用的用户 ID。 */
    @TableField("user_id")
    private Long userId;

    /** 脱敏后的失败详情，禁止写入凭证明文和用户敏感内容。 */
    @TableField("failure_detail")
    private String failureDetail;
}
