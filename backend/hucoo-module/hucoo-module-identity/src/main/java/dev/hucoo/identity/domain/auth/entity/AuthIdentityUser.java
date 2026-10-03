package dev.hucoo.identity.domain.auth.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_auth_identity_user")
public class AuthIdentityUser extends BaseEntity {

    @TableField("username")
    private String username;

    @TableField("display_name")
    private String displayName;

    @TableField("avatar_url")
    private String avatarUrl;

    @TableField("status")
    private String status;

    @TableField("activated_at")
    private LocalDateTime activatedAt;
}
