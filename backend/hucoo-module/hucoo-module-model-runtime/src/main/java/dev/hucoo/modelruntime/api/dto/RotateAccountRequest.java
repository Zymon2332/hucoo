package dev.hucoo.modelruntime.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RotateAccountRequest {
    @NotBlank private String apiKey;
    private String keyFingerprint;
}
