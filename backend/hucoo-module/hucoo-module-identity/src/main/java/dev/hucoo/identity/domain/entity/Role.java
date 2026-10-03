package dev.hucoo.identity.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_role")
public class Role extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("role_code")
    private String roleCode;

    @TableField("role_name")
    private String roleName;

    @TableField("scope")
    private String scope;

    @TableField("role_level")
    private Integer roleLevel;

    @TableField("is_system")
    private Integer system;

    @TableField("status")
    private Integer status;
}
