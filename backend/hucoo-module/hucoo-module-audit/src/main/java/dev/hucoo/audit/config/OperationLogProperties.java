package dev.hucoo.audit.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "agent-platform.modules.audit.operation-log")
public class OperationLogProperties {

    private boolean enabled = true;
    private boolean includeReadOperations = false;
    private int retentionDays = 180;
    private int queueCapacity = 10_000;
    private List<String> excludedPaths = new ArrayList<>(List.of(
            "/actuator/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/api/admin/v1/auth/**",
            "/api/admin/v1/audit-logs/**",
            "/error"));
}
