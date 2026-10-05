package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_credential_rotation", autoResultMap = true)
public class ModelCredentialRotation extends BaseEntity {
    /** 被轮换的凭证 ID */
    @TableField(value = "credential_id")
    private Long credentialId;

    /** 轮换前凭证指纹 */
    @TableField(value = "old_fingerprint")
    private String oldFingerprint;

    /** 轮换后凭证指纹 */
    @TableField(value = "new_fingerprint")
    private String newFingerprint;

    /** 轮换原因 */
    @TableField(value = "reason")
    private String reason;

    /** 执行轮换的用户 ID */
    @TableField(value = "operator_id")
    private Long operatorId;

    /** 轮换完成时间 */
    @TableField(value = "rotated_at")
    private LocalDateTime rotatedAt;

}
