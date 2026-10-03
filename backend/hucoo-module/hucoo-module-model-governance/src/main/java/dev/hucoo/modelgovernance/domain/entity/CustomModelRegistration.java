package dev.hucoo.modelgovernance.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_custom_model_registration")
public class CustomModelRegistration extends BaseEntity {
    @TableField("model_code") private String modelCode;
    @TableField("provider_id") private Long providerId;
    @TableField("visibility") private String visibility;
    @TableField("approval_status") private String approvalStatus;
    @TableField("endpoint") private String endpoint;
    @TableField("key_ref") private String keyRef;
    @TableField("key_fingerprint") private String keyFingerprint;
    @TableField("status") private Integer status;
}
