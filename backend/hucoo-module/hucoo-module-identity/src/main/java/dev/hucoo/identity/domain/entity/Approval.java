package dev.hucoo.identity.domain.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_approval")
public class Approval extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("approval_type")
    private String approvalType;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_id")
    private String resourceId;

    @TableField("applicant_id")
    private Long applicantId;

    @TableField("status")
    private String status;

    @TableField("reason")
    private String reason;

    @TableField("submitted_at")
    private LocalDateTime submittedAt;

    @TableField("completed_at")
    private LocalDateTime completedAt;
}
