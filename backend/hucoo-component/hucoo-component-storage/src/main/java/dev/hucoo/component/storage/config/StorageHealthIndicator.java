package dev.hucoo.component.storage.config;

import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;

import dev.hucoo.component.storage.StorageClient;

/**
 * 对象存储健康检查：对哨兵对象做一次 HEAD，确认驱动可达。
 *
 * <p>Boot 4 把健康检查类型迁到了 {@code org.springframework.boot.health.contributor} 包
 * （{@code spring-boot-health} 模块）。
 */
public class StorageHealthIndicator implements HealthIndicator {

    private final StorageClient storageClient;
    private final StorageProperties properties;

    public StorageHealthIndicator(StorageClient storageClient, StorageProperties properties) {
        this.storageClient = storageClient;
        this.properties = properties;
    }

    @Override
    public Health health() {
        try {
            boolean probeObjectExists = storageClient.exists(properties.getDefaultBucket(),
                    properties.getHealthCheckKey());
            return Health.up()
                    .withDetail("provider", storageClient.provider())
                    .withDetail("bucket", properties.getDefaultBucket())
                    .withDetail("capabilities", storageClient.capabilities().toString())
                    .withDetail("reachable", true)
                    .withDetail("probeObjectExists", probeObjectExists)
                    .build();
        } catch (RuntimeException e) {
            return Health.down()
                    .withDetail("provider", storageClient.provider())
                    .withDetail("bucket", properties.getDefaultBucket())
                    .withDetail("reachable", false)
                    .withException(e)
                    .build();
        }
    }
}
