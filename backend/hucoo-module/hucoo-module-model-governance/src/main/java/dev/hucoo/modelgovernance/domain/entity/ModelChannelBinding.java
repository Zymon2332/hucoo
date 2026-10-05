package dev.hucoo.modelgovernance.domain.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_channel_binding", autoResultMap = true)
public class ModelChannelBinding extends BaseEntity {
    /** 关联的平台模型版本 ID */
    @TableField(value = "model_version_id")
    private Long modelVersionId;

    /** 关联的供应商渠道 ID */
    @TableField(value = "channel_id")
    private Long channelId;

    /** 供应商侧实际模型编码 */
    @TableField(value = "provider_model_code")
    private String providerModelCode;

    /** 渠道内可选的模型别名 */
    @TableField(value = "model_alias", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String modelAlias;

    /** 本映射专用的 Endpoint 覆盖地址 */
    @TableField(value = "endpoint_override", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String endpointOverride;

    /** 渠道对模型能力的覆盖声明 JSON */
    @TableField(value = "capability_override_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String capabilityOverrideJson;

    /** 默认路由权重 */
    @TableField(value = "default_weight")
    private Integer defaultWeight;

    /** 路由目标优先级，数值越小越优先 */
    @TableField(value = "priority")
    private Integer priority;

    /** 该映射允许的最大并发数，0 表示不限制 */
    @TableField(value = "max_concurrency")
    private Integer maxConcurrency;

    /** 映射运行状态：ACTIVE、DRAINING、DISABLED、REVOKED */
    @TableField(value = "status")
    private String status;

    /** 映射审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED */
    @TableField(value = "approval_status")
    private String approvalStatus;

    /** 最近一次模型验证任务 ID */
    @TableField(value = "last_validation_run_id", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long lastValidationRunId;

}
