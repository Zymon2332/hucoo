package dev.hucoo.modelgovernance.domain.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 模型版本或渠道映射的异步验证任务。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_validation_run")
public class ModelValidationRun extends BaseEntity {

    /** 兼容旧模型定义表的模型 ID。 */
    @TableField("model_id")
    private Long modelId;

    /** 待验证的模型版本 ID。 */
    @TableField("model_version_id")
    private Long modelVersionId;

    /** 待验证的模型渠道映射 ID。 */
    @TableField("binding_id")
    private Long bindingId;

    /** 验证任务状态：PENDING、RUNNING、PASSED、FAILED、CANCELLED。 */
    @TableField("status")
    private String status;

    /** 验证进度百分比，范围 0 到 100。 */
    @TableField("progress")
    private Integer progress;

    /** 验证任务已重试次数。 */
    @TableField("retry_count")
    private Integer retryCount;

    /** 验证失败原因，已脱敏处理。 */
    @TableField("failure_reason")
    private String failureReason;
}
