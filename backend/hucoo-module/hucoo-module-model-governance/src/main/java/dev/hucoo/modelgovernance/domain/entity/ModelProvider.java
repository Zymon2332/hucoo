package dev.hucoo.modelgovernance.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_provider")
public class ModelProvider extends BaseEntity {
    /** 租户范围内唯一的供应商编码。 */
    @TableField("provider_code")
    private String providerCode;

    /** 供应商展示名称。 */
    @TableField("provider_name")
    private String providerName;

    /** 供应商默认服务地址，具体渠道可覆盖。 */
    @TableField(value = "endpoint", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String endpoint;

    /** 供应商类型：OFFICIAL、CLOUD、ENTERPRISE、LOCAL、PROXY。 */
    @TableField("provider_type")
    private String providerType;

    /** 供应商官方网站。 */
    @TableField(value = "website", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String website;

    /** 供应商开发文档地址。 */
    @TableField(value = "documentation_url", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String documentationUrl;

    /** 供应商默认服务区域。 */
    @TableField(value = "default_region", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String defaultRegion;

    /** 供应商合规等级。 */
    @TableField(value = "compliance_level", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String complianceLevel;

    /** 供应商业务说明。 */
    @TableField(value = "description", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String description;

    /** 供应商审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED。 */
    @TableField("approval_status")
    private String approvalStatus;

    /** 供应商启用状态：1 启用，0 停用。 */
    @TableField("status")
    private Integer status;
}
