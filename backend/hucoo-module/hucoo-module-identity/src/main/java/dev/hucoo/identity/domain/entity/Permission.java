package dev.hucoo.identity.domain.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_permission")
public class Permission extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("permission_code")
    private String permissionCode;

    @TableField("permission_name")
    private String permissionName;

    @TableField("resource_type")
    private String resourceType;

    @TableField("action")
    private String action;

    @TableField("description")
    private String description;

    @TableField("status")
    private Integer status;
}
