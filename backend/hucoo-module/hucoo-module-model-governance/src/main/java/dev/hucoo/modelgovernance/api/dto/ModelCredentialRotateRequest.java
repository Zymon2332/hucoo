package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelCredentialRotateRequest implements Serializable {
    @NotBlank
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @lombok.ToString.Exclude
    private String secret;
    @NotBlank
    private String reason;
    private LocalDateTime expiresAt;
}
