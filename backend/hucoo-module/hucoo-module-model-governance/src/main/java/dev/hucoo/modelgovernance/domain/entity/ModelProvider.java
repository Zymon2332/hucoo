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
    @TableField("provider_code") private String providerCode;
    @TableField("provider_name") private String providerName;
    @TableField(value = "endpoint", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String endpoint;
    @TableField("provider_type") private String providerType;
    @TableField(value = "website", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String website;
    @TableField(value = "documentation_url", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String documentationUrl;
    @TableField(value = "default_region", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String defaultRegion;
    @TableField(value = "compliance_level", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String complianceLevel;
    @TableField(value = "description", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String description;
    @TableField("approval_status") private String approvalStatus;
    @TableField("status") private Integer status;
}
