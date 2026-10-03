package dev.hucoo.modelruntime.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import dev.hucoo.modelruntime.domain.AccountStatus;
import dev.hucoo.modelruntime.domain.CircuitState;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AccountDTO {
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
