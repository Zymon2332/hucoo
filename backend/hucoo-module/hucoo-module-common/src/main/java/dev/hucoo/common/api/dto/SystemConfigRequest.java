package dev.hucoo.common.api.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SystemConfigRequest {
    @NotBlank
    @Size(max = 128)
    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9_.:-]*")
    private String key;
    @NotBlank
    @Size(max = 128)
    private String name;
    @NotBlank
    @Size(max = 128)
    private String group;
    @NotNull
    private ConfigValueType valueType;
    @NotNull
    @io.swagger.v3.oas.annotations.media.Schema(implementation = Object.class, types = {"string", "number", "boolean", "object", "array"}, description = "由 valueType 决定的 JSON 值；JSON 类型限对象或数组")
    private tools.jackson.databind.JsonNode value;
    @NotNull
    private Boolean enabled = true;
    @Size(max = 512)
    private String remarks;
    @Min(0)
    private Integer version;
}
