package dev.hucoo.component.security.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

import dev.hucoo.commons.api.PlatformConstants;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "agent-platform.security")
public class SecurityProperties {

    private boolean enabled = false;
    private String jwtSecret = "hucoo-agent-platform-local-secret-please-change";
    private long tokenTtlMinutes = 120L;
    private String defaultTenantId = PlatformConstants.SYSTEM_TENANT_ID;
    private List<String> ignoredPaths = new ArrayList<>(List.of(
            "/actuator/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/error"));
}
