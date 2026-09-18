package dev.hucoo.billing.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.billing", name = "enabled", havingValue = "true", matchIfMissing = true)
public class UsageRecordModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(UsageRecordModuleConfig.class);

    public UsageRecordModuleConfig() {
        log.info("hucoo-module-billing initialized");
    }
}
