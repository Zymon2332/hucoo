package dev.hucoo.modelgovernance.domain.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model", autoResultMap = true)
public class LogicalModel extends BaseEntity {
    /** 平台内部稳定模型编码 */
    @TableField(value = "model_code")
    private String modelCode;

    /** 模型展示名称 */
    @TableField(value = "model_name")
    private String modelName;

    /** 模型系列，例如 GPT、DeepSeek 或 Embedding 系列 */
    @TableField(value = "model_family", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String modelFamily;

    /** 模型类型：CHAT、EMBEDDING、RERANK、IMAGE、AUDIO 等 */
    @TableField(value = "model_type")
    private String modelType;

    /** 模型来源：PLATFORM、CUSTOM、LOCAL、ENTERPRISE */
    @TableField(value = "source_type")
    private String sourceType;

    /** 模型生命周期：DRAFT、VALIDATING、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED */
    @TableField(value = "lifecycle_status")
    private String lifecycleStatus;

    /** 模型业务说明 */
    @TableField(value = "description", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String description;

    /** 模型扩展元数据 JSON，不得保存凭证明文 */
    @TableField(value = "metadata_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String metadataJson;

    /** 用户私有模型的拥有者用户 ID */
    @TableField(value = "owner_user_id", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long ownerUserId;

}
