package dev.hucoo.gateway.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "agent-platform.gateway.auth")
public class GatewayAuthProperties {

    private boolean enabled = false;
    private String tokenHeader = "Authorization";
    private List<String> whitelist = new ArrayList<>(List.of(
            "/actuator/**",
            "/api/admin/v1/public/**",
            "/api/admin/v1/auth/**"));
}
