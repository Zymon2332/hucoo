package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_key")
public class ModelKey extends BaseEntity {
    /** 密钥展示名称。 */
    @TableField("key_name")
    private String keyName;

    /** 密钥保险箱中的引用，不保存密钥明文。 */
    @TableField("key_ref")
    private String keyRef;

    /** 密钥指纹，用于去重和审计。 */
    @TableField("key_fingerprint")
    private String keyFingerprint;

    /** 密钥状态。 */
    @TableField("status")
    private String status;

    /** 密钥过期时间。 */
    @TableField("expires_at")
    private LocalDateTime expiresAt;

    /** 最近一次密钥轮换时间。 */
    @TableField("last_rotated_at")
    private LocalDateTime lastRotatedAt;
}
