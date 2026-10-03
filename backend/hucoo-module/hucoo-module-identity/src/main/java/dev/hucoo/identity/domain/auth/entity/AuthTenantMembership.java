package dev.hucoo.identity.domain.auth.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_auth_tenant_membership")
public class AuthTenantMembership extends BaseEntity {

    @TableField("user_id")
    private Long userId;

    @TableField("organization_id")
    private Long organizationId;

    @TableField("membership_status")
    private String membershipStatus;

    @TableField("source")
    private String source;

    @TableField("default_membership")
    private Integer defaultMembership;
}
