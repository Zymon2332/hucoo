package dev.hucoo.identity.domain.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_approval_step")
public class ApprovalStep extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("approval_id")
    private Long approvalId;

    @TableField("step_no")
    private Integer stepNo;

    @TableField("approver_id")
    private Long approverId;

    @TableField("status")
    private String status;

    @TableField("action")
    private String action;

    @TableField("comment")
    private String comment;

    @TableField("acted_at")
    private LocalDateTime actedAt;
}
