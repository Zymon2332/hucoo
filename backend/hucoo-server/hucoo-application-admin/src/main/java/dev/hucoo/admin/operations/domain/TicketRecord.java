package dev.hucoo.admin.operations.domain;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_ticket")
public class TicketRecord extends BaseEntity {
    @TableField("ticket_no") private String ticketNo;
    @TableField("title") private String title;
    @TableField("description") private String description;
    @TableField("priority") private String priority;
    @TableField("status") private String status;
    @TableField("assignee_id") private Long assigneeId;
}
