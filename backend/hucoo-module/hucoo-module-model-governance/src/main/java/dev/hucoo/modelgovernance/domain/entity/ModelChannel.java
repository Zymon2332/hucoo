package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_channel", autoResultMap = true)
public class ModelChannel extends BaseEntity {

    /** 所属模型供应商 ID。 */
    @TableField("provider_id")
    private Long providerId;

    /** 供应商范围内唯一的渠道编码。 */
    @TableField("channel_code")
    private String channelCode;

    /** 渠道展示名称。 */
    @TableField("channel_name")
    private String channelName;

    /** 协议类型：OPENAI_COMPATIBLE、ANTHROPIC、GEMINI、OLLAMA、VLLM、CUSTOM。 */
    @TableField("protocol_type")
    private String protocolType;

    /** 渠道服务根地址，不包含凭证。 */
    @TableField("endpoint")
    private String endpoint;

    /** 协议 API 基础路径。 */
    @TableField(value = "base_path", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String basePath;

    /** 渠道所在服务区域。 */
    @TableField(value = "region", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String region;

    /** 渠道网络区域，例如 PUBLIC、PRIVATE、INTRANET。 */
    @TableField(value = "network_zone", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String networkZone;

    /** 认证类型：API_KEY、OAUTH2、MTLS、NONE。 */
    @TableField("auth_type")
    private String authType;

    /** 协议专属配置 JSON，必须包含 schemaVersion，禁止保存密钥明文。 */
    @TableField(value = "protocol_config_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String protocolConfigJson;

    /** 非流式请求超时时间，单位毫秒。 */
    @TableField("request_timeout_ms")
    private Long requestTimeoutMs;

    /** 流式请求空闲超时时间，单位毫秒。 */
    @TableField("stream_timeout_ms")
    private Long streamTimeoutMs;

    /** 关联的出网策略 ID。 */
    @TableField(value = "network_policy_id", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long networkPolicyId;

    /** 渠道运行状态：ACTIVE、DRAINING、DISABLED、REVOKED。 */
    @TableField("status")
    private String status;

    /** 渠道审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED。 */
    @TableField("approval_status")
    private String approvalStatus;

    /** 渠道健康状态：UNKNOWN、HEALTHY、DEGRADED、UNHEALTHY。 */
    @TableField("health_status")
    private String healthStatus;

    /** 最近一次健康检查时间。 */
    @TableField(value = "last_health_checked_at", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime lastHealthCheckedAt;
}
