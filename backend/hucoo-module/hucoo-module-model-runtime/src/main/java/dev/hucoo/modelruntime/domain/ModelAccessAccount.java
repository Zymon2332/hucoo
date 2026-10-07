package dev.hucoo.modelruntime.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ModelAccessAccount {
    private Long id;
    private Long providerId;
    private String providerCode;
    private String modelCode;
    private String accountName;
    private String endpoint;
    private String keyRef;
    @Builder.Default
    private boolean authenticationRequired = true;
    private String keyFingerprint;
    private int configuredWeight;
    private int maxConcurrency;
    private BigDecimal balance;
    private BigDecimal lowBalanceThreshold;
    private BigDecimal hardStopBalanceThreshold;
    private AccountStatus status;
    private CircuitState circuitState;
    private Instant cooldownUntil;
    private final AtomicInteger inFlight = new AtomicInteger();
    private final AtomicInteger consecutiveFailures = new AtomicInteger();
    private final AtomicLong totalRequests = new AtomicLong();
    private final AtomicLong failedRequests = new AtomicLong();
    private volatile double healthScore;

    public boolean available(Instant now) {
        if (status != AccountStatus.ACTIVE) return false;
        if (circuitState == CircuitState.OPEN && (cooldownUntil == null || cooldownUntil.isAfter(now))) return false;
        if (circuitState == CircuitState.OPEN && cooldownUntil != null && !cooldownUntil.isAfter(now)) circuitState = CircuitState.HALF_OPEN;
        if (cooldownUntil != null && cooldownUntil.isAfter(now)) return false;
        if (hardStopBalanceThreshold != null && balance != null && balance.compareTo(hardStopBalanceThreshold) <= 0) return false;
        return maxConcurrency <= 0 || inFlight.get() < maxConcurrency;
    }

    public double effectiveWeight(double lowBalanceFactor) {
        double health = healthScore <= 0 ? 1.0 : Math.min(1.0, healthScore);
        double balanceFactor = 1.0;
        if (lowBalanceThreshold != null && balance != null && balance.compareTo(lowBalanceThreshold) <= 0) {
            balanceFactor = lowBalanceFactor;
        }
        double loadFactor = maxConcurrency <= 0 ? 1.0 : Math.max(0.05, 1.0 - ((double) inFlight.get() / maxConcurrency));
        return Math.max(0.01, Math.max(1, configuredWeight) * health * balanceFactor * loadFactor);
    }

    public boolean tryAcquire() {
        if (maxConcurrency <= 0) { inFlight.incrementAndGet(); return true; }
        while (true) {
            int current = inFlight.get();
            if (current >= maxConcurrency) return false;
            if (inFlight.compareAndSet(current, current + 1)) return true;
        }
    }

    public void release(boolean success) {
        inFlight.updateAndGet(value -> Math.max(0, value - 1));
        totalRequests.incrementAndGet();
        if (success) {
            consecutiveFailures.set(0);
            healthScore = Math.min(1.0, (healthScore <= 0 ? 0.8 : healthScore) + 0.05);
        } else {
            failedRequests.incrementAndGet();
            consecutiveFailures.incrementAndGet();
            healthScore = Math.max(0.05, (healthScore <= 0 ? 0.5 : healthScore) * 0.75);
        }
    }
}
