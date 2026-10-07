package dev.hucoo.modelruntime.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "agent-platform.model-runtime")
public class ModelRuntimeProperties {
    private boolean enabled = true;
    private String openCodeGoUserAgent = "hucoo-agent-platform/1.0";
    private boolean persistenceEnabled;
    private int maxAttempts = 3;
    private Duration connectTimeout = Duration.ofSeconds(2);
    private Duration responseTimeout = Duration.ofSeconds(30);
    private Duration streamIdleTimeout = Duration.ofSeconds(60);
    private Duration routeCacheTtl = Duration.ofSeconds(30);
    private int circuitFailureThreshold = 5;
    private int circuitWindowSeconds = 60;
    private int circuitOpenSeconds = 30;
    private double lowBalanceFactor = 0.5;
    private int defaultWeight = 1;
}
