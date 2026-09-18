package dev.hucoo.tenant.domain.entity;

import java.time.LocalDateTime;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_tenant")
public class Tenant extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("tenant_code")
    private String tenantCode;

    @TableField("tenant_name")
    private String tenantName;

    @TableField("contact_email")
    private String contactEmail;

    @TableField("plan_code")
    private String planCode;

    @TableField("status")
    private Integer status;

    @TableField("expire_at")
    private LocalDateTime expireAt;

}
