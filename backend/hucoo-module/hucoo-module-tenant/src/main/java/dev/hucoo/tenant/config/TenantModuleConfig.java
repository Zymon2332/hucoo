package dev.hucoo.tenant.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.tenant", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TenantModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(TenantModuleConfig.class);

    public TenantModuleConfig() {
        log.info("hucoo-module-tenant initialized");
    }
}
