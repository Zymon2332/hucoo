package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_version", autoResultMap = true)
public class ModelVersion extends BaseEntity {
    /**
     * 所属逻辑模型 ID
     */
    @TableField(value = "model_id")
    private Long modelId;

    /**
     * 模型版本编码，例如 2024-08-06
     */
    @TableField(value = "version_code")
    private String versionCode;

    /**
     * 最大上下文 Token 数
     */
    @TableField(value = "context_window", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long contextWindow;

    /**
     * 最大输入 Token 数
     */
    @TableField(value = "max_input_tokens", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long maxInputTokens;

    /**
     * 最大输出 Token 数
     */
    @TableField(value = "max_output_tokens", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private Long maxOutputTokens;

    /**
     * 输入模态 JSON，例如 text、image、audio
     */
    @TableField(value = "input_modalities_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String inputModalitiesJson;

    /**
     * 输出模态 JSON，例如 text、image、audio
     */
    @TableField(value = "output_modalities_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String outputModalitiesJson;

    /**
     * 模型默认推理参数 JSON
     */
    @TableField(value = "default_parameters_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String defaultParametersJson;

    /**
     * 版本状态：DRAFT、VALIDATING、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED
     */
    @TableField(value = "release_status")
    private String releaseStatus;

    /**
     * 版本发布时间
     */
    @TableField(value = "released_at")
    private LocalDateTime releasedAt;

    /**
     * 版本计划废弃时间
     */
    @TableField(value = "deprecated_at", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime deprecatedAt;

    /**
     * 模型版本扩展元数据 JSON
     */
    @TableField(value = "metadata_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private String metadataJson;

}
