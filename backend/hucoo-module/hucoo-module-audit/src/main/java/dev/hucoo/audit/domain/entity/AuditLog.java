package dev.hucoo.audit.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_audit_log")
public class AuditLog extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("operator_id")
    private Long operatorId;

    @TableField("operator_name")
    private String operatorName;

    @TableField("action")
    private String action;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_id")
    private String resourceId;

    @TableField("result")
    private Integer result;

    @TableField("client_ip")
    private String clientIp;

    @TableField("trace_id")
    private String traceId;

    @TableField("data_scope")
    private String dataScope;

}
