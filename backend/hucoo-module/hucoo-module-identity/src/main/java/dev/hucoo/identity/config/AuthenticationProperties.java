package dev.hucoo.identity.config;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "agent-platform.authentication")
public class AuthenticationProperties {

    private boolean enabled = true;
    private long accessTokenTtlMinutes = 20L;
    private long refreshTokenTtlDays = 30L;
    private long verificationCodeTtlSeconds = 300L;
    private int maxVerificationAttempts = 5;
    private int loginFailureThreshold = 5;
    private long loginLockMinutes = 15L;
    private String jwtKeyId = "local-v1";
    private Map<String, Boolean> providers = new LinkedHashMap<>(Map.of(
            "password", true,
            "sms", false,
            "email", false,
            "wechat", false,
            "qq", false));

    public boolean isProviderEnabled(String provider) {
        return providers.getOrDefault(provider.toLowerCase(), false);
    }
}
