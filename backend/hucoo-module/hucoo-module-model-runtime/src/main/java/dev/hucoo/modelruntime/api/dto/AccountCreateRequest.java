package dev.hucoo.modelruntime.api.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AccountCreateRequest {
    @NotBlank private String providerCode;
    @NotBlank private String modelCode;
    @NotBlank private String accountName;
    @NotBlank private String endpoint;
    @NotBlank private String apiKey;
    private String keyFingerprint;
    @NotNull private Integer configuredWeight;
    private Integer maxConcurrency = 0;
    private BigDecimal balance;
    private BigDecimal lowBalanceThreshold;
    private BigDecimal hardStopBalanceThreshold;
}
