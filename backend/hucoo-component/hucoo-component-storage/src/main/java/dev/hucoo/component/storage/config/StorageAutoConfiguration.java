package dev.hucoo.component.storage.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.local.LocalStorageClient;
import dev.hucoo.component.storage.local.LocalStorageProperties;
import dev.hucoo.component.storage.memory.InMemoryStorageClient;
import dev.hucoo.component.storage.s3.S3StorageConfiguration;

/**
 * 对象存储自动配置入口，通过
 * {@code META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports} 激活。
 *
 * <p>驱动由 {@code agent-platform.storage.type} 选择：{@code s3} / {@code local} / {@code memory}。
 */
@AutoConfiguration
@EnableConfigurationProperties(StorageProperties.class)
@ConditionalOnProperty(prefix = "agent-platform.storage", name = "enabled",
        havingValue = "true", matchIfMissing = true)
public class StorageAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(StorageAutoConfiguration.class);

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.storage", name = "type", havingValue = "s3")
    @Import(S3StorageConfiguration.class)
    static class S3StorageEnabled {
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.storage", name = "type",
            havingValue = "local", matchIfMissing = true)
    @EnableConfigurationProperties(LocalStorageProperties.class)
    static class LocalStorageEnabled {

        @Bean
        @ConditionalOnMissingBean(StorageClient.class)
        public StorageClient localStorageClient(LocalStorageProperties properties) {
            return new LocalStorageClient(properties);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.storage", name = "type", havingValue = "memory")
    static class MemoryStorageEnabled {

        @Bean
        @ConditionalOnMissingBean(StorageClient.class)
        public StorageClient inMemoryStorageClient() {
            return new InMemoryStorageClient();
        }
    }

    @Bean
    @ConditionalOnMissingBean
    public StorageHealthIndicator storageHealthIndicator(StorageClient storageClient, StorageProperties properties) {
        return new StorageHealthIndicator(storageClient, properties);
    }

    @Bean
    @ConditionalOnMissingBean(name = "storageBucketInitializer")
    public ApplicationRunner storageBucketInitializer(StorageClient storageClient, StorageProperties properties) {
        return args -> {
            log.info("storage driver initialized: type={}, bucket={}", storageClient.provider(),
                    properties.getDefaultBucket());
            if (!properties.isAutoCreateBucket()) {
                return;
            }
            try {
                storageClient.ensureBucket(properties.getDefaultBucket());
            } catch (RuntimeException e) {
                // 启动阶段不阻塞：健康检查会如实反映不可用状态
                log.warn("ensure storage bucket failed: bucket={}, provider={}",
                        properties.getDefaultBucket(), storageClient.provider(), e);
            }
        };
    }
}
