package dev.hucoo.monitoring.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.monitoring", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AlertRuleModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(AlertRuleModuleConfig.class);

    public AlertRuleModuleConfig() {
        log.info("hucoo-module-monitoring initialized");
    }
}
