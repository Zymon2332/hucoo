package dev.hucoo.modelruntime.client.dto;

import java.math.BigDecimal;
import java.time.Instant;

import lombok.Data;

@Data
public class RouteAccountDTO {

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
    private String status;
    private String circuitState;
    private double healthScore;
    private double effectiveWeight;
    private long totalRequests;
    private long failedRequests;
    private Instant cooldownUntil;
}
