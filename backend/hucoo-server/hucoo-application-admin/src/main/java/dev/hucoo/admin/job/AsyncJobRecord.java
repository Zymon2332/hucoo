package dev.hucoo.admin.job;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_async_job")
public class AsyncJobRecord extends BaseEntity {

    @TableField("job_id")
    private String jobId;

    @TableField("request_id")
    private String requestId;

    @TableField("job_type")
    private String jobType;

    @TableField("status")
    private String status;

    @TableField("progress")
    private Integer progress;

    @TableField("message")
    private String message;

    @TableField("result_json")
    private String resultJson;

    @TableField("retry_count")
    private Integer retryCount;

    @TableField("cancel_requested")
    private Integer cancelRequested;

    @TableField("owner_id")
    private String ownerId;

    @TableField("lease_until")
    private java.time.LocalDateTime leaseUntil;

    @TableField("attempt")
    private Integer attempt;
}
