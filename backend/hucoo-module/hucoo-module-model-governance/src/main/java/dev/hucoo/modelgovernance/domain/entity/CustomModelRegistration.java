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
    /** 旧版自定义模型编码。 */
    @TableField("model_code")
    private String modelCode;

    /** 关联的模型供应商 ID。 */
    @TableField("provider_id")
    private Long providerId;

    /** 模型可见性范围。 */
    @TableField("visibility")
    private String visibility;

    /** 模型注册审批状态。 */
    @TableField("approval_status")
    private String approvalStatus;

    /** 自定义模型服务地址。 */
    @TableField("endpoint")
    private String endpoint;

    /** 旧版密钥引用，不保存密钥明文。 */
    @TableField("key_ref")
    private String keyRef;

    /** 旧版密钥指纹，用于去重和审计。 */
    @TableField("key_fingerprint")
    private String keyFingerprint;

    /** 注册状态：1 启用，0 停用。 */
    @TableField("status")
    private Integer status;
}
