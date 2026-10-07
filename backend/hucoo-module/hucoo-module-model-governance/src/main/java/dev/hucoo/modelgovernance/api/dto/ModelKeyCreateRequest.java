package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelKeyCreateRequest implements Serializable {
    @NotBlank
    private String keyName;
    @NotBlank
    private String keyRef;
    @NotBlank
    private String keyFingerprint;
    private LocalDateTime expiresAt;
}
