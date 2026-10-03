package dev.hucoo.admin.operations.domain;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_announcement")
public class AnnouncementRecord extends BaseEntity {
    @TableField("title") private String title;
    @TableField("content") private String content;
    @TableField("status") private String status;
    @TableField("published_at") private java.time.LocalDateTime publishedAt;
}
