package dev.hucoo.modelgovernance.domain.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 模型验证任务中的单项检查结果。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_validation_check")
public class ModelValidationCheck extends BaseEntity {

    /** 所属验证任务 ID。 */
    @TableField("run_id")
    private Long runId;

    /** 检查项编码，例如 CONNECTIVITY、STREAMING、TOOL_CALLING。 */
    @TableField("check_code")
    private String checkCode;

    /** 检查状态：PENDING、RUNNING、PASSED、FAILED、SKIPPED。 */
    @TableField("status")
    private String status;

    /** 检查失败原因，已脱敏处理。 */
    @TableField("failure_reason")
    private String failureReason;

    /** 检查结果 JSON，不得保存凭证明文或用户敏感内容。 */
    @TableField("result_json")
    private String resultJson;
}
