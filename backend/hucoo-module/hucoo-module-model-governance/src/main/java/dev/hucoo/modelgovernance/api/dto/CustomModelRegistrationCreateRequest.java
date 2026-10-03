package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomModelRegistrationCreateRequest implements Serializable {
    @NotBlank private String modelCode;
    private Long providerId;
    private String visibility;
    private String endpoint;
    private String keyRef;
    private String keyFingerprint;
    private Integer status;
}
