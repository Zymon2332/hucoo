package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 模型治理领域事件的可靠投递记录。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_event_outbox")
public class ModelEventOutbox extends BaseEntity {

    /** 领域事件类型。 */
    @TableField("event_type")
    private String eventType;

    /** 事件关联的聚合 ID。 */
    @TableField("aggregate_id")
    private String aggregateId;

    /** 事件负载 JSON。 */
    @TableField("payload")
    private String payload;

    /** 投递状态：PENDING、PROCESSING、PUBLISHED、FAILED。 */
    @TableField("status")
    private String status;

    /** 已重试次数。 */
    @TableField("retry_count")
    private Integer retryCount;

    /** 下一次重试时间。 */
    @TableField("next_retry_at")
    private LocalDateTime nextRetryAt;
}
