package dev.hucoo.modelgovernance.domain.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_version_capability", autoResultMap = true)
public class ModelVersionCapability extends BaseEntity {
    /** 关联的模型版本 ID */
    @TableField(value = "model_version_id")
    private Long modelVersionId;

    /** 能力编码，例如 STREAMING、TOOL_CALLING、JSON_MODE、VISION_INPUT */
    @TableField(value = "capability_code")
    private String capabilityCode;

    /** 是否支持该能力：1 支持，0 不支持 */
    @TableField(value = "supported")
    private Integer supported;

    /** 能力约束 JSON，例如最大图片数量或工具数量 */
    @TableField(value = "constraint_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class)
    private String constraintJson;

}
