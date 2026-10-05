package dev.hucoo.modelgovernance.domain.entity;

import java.math.BigDecimal;
import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_route_target", autoResultMap = true)
public class ModelRouteTarget extends BaseEntity {
    /** 所属路由策略 ID */
    @TableField(value = "route_policy_id")
    private Long routePolicyId;
    /** 旧版供应商 ID */
    @TableField(value = "provider_id")
    private Long providerId;
    /** 目标模型编码 */
    @TableField(value = "model_code")
    private String modelCode;
    /** 旧版模型密钥 ID */
    @TableField(value = "model_key_id")
    private Long modelKeyId;
    /** 目标专用 Endpoint 覆盖地址 */
    @TableField(value = "endpoint_override")
    private String endpointOverride;
    /** 目标配置权重 */
    @TableField(value = "configured_weight")
    private Integer configuredWeight;
    /** 目标最大并发数，0 表示不限制 */
    @TableField(value = "max_concurrency")
    private Integer maxConcurrency;
    /** 目标优先级，数值越小越优先 */
    @TableField(value = "priority")
    private Integer priority;
    /** 目标状态：ACTIVE、DRAINING、DISABLED、REVOKED */
    @TableField(value = "status")
    private String status;
    /** 模型渠道映射 ID */
    @TableField(value = "binding_id")
    private Long bindingId;
    /** 本路由目标使用的凭证 ID */
    @TableField(value = "credential_id")
    private Long credentialId;
    /** 本路由目标的单次成本限制 */
    @TableField(value = "cost_limit")
    private BigDecimal costLimit;
    /** 允许进入路由的最低健康分 */
    @TableField(value = "health_threshold")
    private BigDecimal healthThreshold;
}
