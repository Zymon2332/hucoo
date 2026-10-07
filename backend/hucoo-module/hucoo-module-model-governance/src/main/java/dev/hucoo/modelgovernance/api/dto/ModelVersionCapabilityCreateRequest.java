package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ModelVersionCapabilityCreateRequest implements Serializable {
    @NotBlank
    @io.swagger.v3.oas.annotations.media.Schema(description = "能力编码，例如 STREAMING、TOOL_CALLING、JSON_MODE、VISION_INPUT")
    private String capabilityCode;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "是否支持该能力：1 支持，0 不支持")
    private Integer supported;
    @io.swagger.v3.oas.annotations.media.Schema(description = "能力约束 JSON，例如最大图片数量或工具数量")
    private String constraintJson;
}
