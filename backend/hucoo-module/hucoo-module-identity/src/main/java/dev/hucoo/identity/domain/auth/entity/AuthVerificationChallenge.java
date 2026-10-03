package dev.hucoo.identity.domain.auth.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_auth_verification_challenge")
public class AuthVerificationChallenge extends BaseEntity {

    @TableField("channel")
    private String channel;

    @TableField("purpose")
    private String purpose;

    @TableField("destination")
    private String destination;

    @TableField("code_hash")
    private String codeHash;

    @TableField("expires_at")
    private LocalDateTime expiresAt;

    @TableField("consumed_at")
    private LocalDateTime consumedAt;

    @TableField("attempts")
    private Integer attempts;
}
