package dev.hucoo.identity.domain.auth.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_auth_refresh_session")
public class AuthRefreshSession extends BaseEntity {

    @TableField("user_id")
    private Long userId;

    @TableField("client_id")
    private String clientId;

    @TableField("device_id")
    private String deviceId;

    @TableField("token_hash")
    private String tokenHash;

    @TableField("token_family")
    private String tokenFamily;

    @TableField("expires_at")
    private LocalDateTime expiresAt;

    @TableField("revoked_at")
    private LocalDateTime revokedAt;

    @TableField("replaced_by")
    private Long replacedBy;

    @TableField("session_status")
    private String sessionStatus;
}
