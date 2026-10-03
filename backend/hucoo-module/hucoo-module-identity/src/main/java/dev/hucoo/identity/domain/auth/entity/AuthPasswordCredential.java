package dev.hucoo.identity.domain.auth.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_auth_password_credential")
public class AuthPasswordCredential extends BaseEntity {

    @TableField("user_id")
    private Long userId;

    @TableField("password_hash")
    private String passwordHash;

    @TableField("failed_attempts")
    private Integer failedAttempts;

    @TableField("locked_until")
    private LocalDateTime lockedUntil;

    @TableField("password_changed_at")
    private LocalDateTime passwordChangedAt;
}
