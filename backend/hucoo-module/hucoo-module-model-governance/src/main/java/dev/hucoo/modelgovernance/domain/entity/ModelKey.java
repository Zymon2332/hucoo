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
    @TableField("key_name") private String keyName;
    @TableField("key_ref") private String keyRef;
    @TableField("key_fingerprint") private String keyFingerprint;
    @TableField("status") private String status;
    @TableField("expires_at") private LocalDateTime expiresAt;
    @TableField("last_rotated_at") private LocalDateTime lastRotatedAt;
}
