package dev.hucoo.admin.operations.domain;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_ticket_message")
public class TicketMessageRecord extends BaseEntity {
    @TableField("ticket_id") private Long ticketId;
    @TableField("sender_id") private Long senderId;
    @TableField("content") private String content;
}
