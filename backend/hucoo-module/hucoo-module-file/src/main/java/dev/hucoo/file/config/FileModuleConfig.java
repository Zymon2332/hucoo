package dev.hucoo.file.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(FileModuleProperties.class)
@ConditionalOnProperty(prefix = "agent-platform.modules.file", name = "enabled",
        havingValue = "true", matchIfMissing = true)
public class FileModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(FileModuleConfig.class);

    public FileModuleConfig(FileModuleProperties properties) {
        log.info("hucoo-module-file initialized: maxFileSize={}, downloadAudit={}",
                properties.getMaxFileSize(), properties.isDownloadAuditEnabled());
    }
}
