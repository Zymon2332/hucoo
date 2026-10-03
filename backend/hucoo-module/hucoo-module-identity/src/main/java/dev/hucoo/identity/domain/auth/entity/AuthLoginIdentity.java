package dev.hucoo.identity.domain.auth.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_auth_login_identity")
public class AuthLoginIdentity extends BaseEntity {

    @TableField("user_id")
    private Long userId;

    @TableField("method")
    private String method;

    @TableField("identifier")
    private String identifier;

    @TableField("provider_subject")
    private String providerSubject;

    @TableField("verified_at")
    private LocalDateTime verifiedAt;

    @TableField("status")
    private String status;
}
