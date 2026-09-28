package dev.hucoo.security.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_security_policy")
public class SecurityPolicy extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("policy_code")
    private String policyCode;

    @TableField("policy_name")
    private String policyName;

    @TableField("policy_type")
    private String policyType;

    @TableField("policy_content")
    private String policyContent;

    @TableField("enabled")
    private Integer enabled;

}
