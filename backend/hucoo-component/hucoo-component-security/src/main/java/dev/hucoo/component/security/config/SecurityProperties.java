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
    private String jwtKeyId = "local-v1";
    private long tokenTtlMinutes = 120L;
    private String defaultTenantId = PlatformConstants.SYSTEM_TENANT_ID;
    private List<String> ignoredPaths = new ArrayList<>(List.of(
            "/actuator/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/api/admin/v1/auth/register",
            "/api/admin/v1/auth/login",
            "/api/admin/v1/auth/refresh",
            "/api/admin/v1/auth/providers",
            "/api/admin/v1/auth/verification-codes",
            "/api/admin/v1/auth/oauth/**",
            "/error"));
}
