package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_visibility_grant", autoResultMap = true)
public class ModelVisibilityGrant extends BaseEntity {
    /** 关联的逻辑模型 ID */
    @TableField(value = "model_id")
    private Long modelId;

    /** 范围类型：PLATFORM、TENANT、PROJECT、USER */
    @TableField(value = "scope_type")
    private String scopeType;

    /** 范围对象 ID，平台范围使用空字符串 */
    @TableField(value = "scope_id")
    private String scopeId;

    /** 授权效果：ALLOW 或 DENY，DENY 优先 */
    @TableField(value = "effect")
    private String effect;

    /** 授权生效时间 */
    @TableField(value = "valid_from", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime validFrom;

    /** 授权失效时间 */
    @TableField(value = "valid_to", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime validTo;

}
