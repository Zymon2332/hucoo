package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelVersionDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "所属逻辑模型 ID")
    private Long modelId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型版本编码，例如 2024-08-06")
    private String versionCode;
    @io.swagger.v3.oas.annotations.media.Schema(description = "最大上下文 Token 数")
    private Long contextWindow;
    @io.swagger.v3.oas.annotations.media.Schema(description = "最大输入 Token 数")
    private Long maxInputTokens;
    @io.swagger.v3.oas.annotations.media.Schema(description = "最大输出 Token 数")
    private Long maxOutputTokens;
    @io.swagger.v3.oas.annotations.media.Schema(description = "输入模态 JSON，例如 text、image、audio")
    private String inputModalitiesJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "输出模态 JSON，例如 text、image、audio")
    private String outputModalitiesJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型默认推理参数 JSON")
    private String defaultParametersJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "版本状态：DRAFT、VALIDATING、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED")
    private String releaseStatus;
    @io.swagger.v3.oas.annotations.media.Schema(description = "版本发布时间")
    private LocalDateTime releasedAt;
    @io.swagger.v3.oas.annotations.media.Schema(description = "版本计划废弃时间")
    private LocalDateTime deprecatedAt;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型版本扩展元数据 JSON")
    private String metadataJson;
}
