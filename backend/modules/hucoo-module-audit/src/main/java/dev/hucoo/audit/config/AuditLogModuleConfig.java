package dev.hucoo.audit.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.audit", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AuditLogModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(AuditLogModuleConfig.class);

    public AuditLogModuleConfig() {
        log.info("hucoo-module-audit initialized");
    }
}
