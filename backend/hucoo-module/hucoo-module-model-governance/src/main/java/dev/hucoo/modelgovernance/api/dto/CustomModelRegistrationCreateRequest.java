package dev.hucoo.modelgovernance.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.io.Serializable;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomModelRegistrationCreateRequest implements Serializable {
    @NotBlank
    private String modelCode;
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long providerId;
    private String visibility;
    private String endpoint;
    private String keyRef;
    private String keyFingerprint;
    private Integer status;
}
