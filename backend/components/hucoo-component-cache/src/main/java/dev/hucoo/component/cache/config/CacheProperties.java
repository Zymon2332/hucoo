package dev.hucoo.component.cache.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "agent-platform.cache")
public class CacheProperties {

    private String type = "caffeine";
    private long ttlMinutes = 30L;
    private long maxSize = 10_000L;
    private List<String> cacheNames = new ArrayList<>(List.of(
            CacheNames.TENANT,
            CacheNames.USER,
            CacheNames.MODEL,
            CacheNames.AGENT,
            CacheNames.SECURITY_POLICY));
}
