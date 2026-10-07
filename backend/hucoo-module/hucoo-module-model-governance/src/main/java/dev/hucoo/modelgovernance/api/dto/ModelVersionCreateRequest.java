package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;
import java.io.Serializable;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ModelVersionCreateRequest implements Serializable {
    @NotBlank
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型版本编码，例如 2024-08-06")
    private String versionCode;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "最大上下文 Token 数")
    private Long contextWindow;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "最大输入 Token 数")
    private Long maxInputTokens;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "最大输出 Token 数")
    private Long maxOutputTokens;
    @io.swagger.v3.oas.annotations.media.Schema(description = "输入模态 JSON，例如 text、image、audio")
    private String inputModalitiesJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "输出模态 JSON，例如 text、image、audio")
    private String outputModalitiesJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型默认推理参数 JSON")
    private String defaultParametersJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "版本计划废弃时间")
    private LocalDateTime deprecatedAt;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型版本扩展元数据 JSON")
    private String metadataJson;
}
