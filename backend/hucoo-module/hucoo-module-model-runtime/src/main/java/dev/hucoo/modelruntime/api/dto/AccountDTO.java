package dev.hucoo.modelruntime.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.math.BigDecimal;
import java.time.Instant;
import dev.hucoo.modelruntime.domain.AccountStatus;
import dev.hucoo.modelruntime.domain.CircuitState;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AccountDTO {
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String providerCode;
    private String modelCode;
    private String accountName;
    private String endpoint;
    private String keyFingerprint;
    private int configuredWeight;
    private int maxConcurrency;
    private int inFlight;
    private BigDecimal balance;
    private BigDecimal lowBalanceThreshold;
    private BigDecimal hardStopBalanceThreshold;
    private AccountStatus status;
    private CircuitState circuitState;
    private double healthScore;
    private double effectiveWeight;
    private long totalRequests;
    private long failedRequests;
    private Instant cooldownUntil;
}
