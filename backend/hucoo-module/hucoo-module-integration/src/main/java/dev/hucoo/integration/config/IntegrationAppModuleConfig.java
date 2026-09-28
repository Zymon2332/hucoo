package dev.hucoo.integration.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableFeignClients(basePackages = "dev.hucoo.integration")
@ConditionalOnProperty(prefix = "agent-platform.modules.integration", name = "enabled", havingValue = "true", matchIfMissing = true)
public class IntegrationAppModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(IntegrationAppModuleConfig.class);

    public IntegrationAppModuleConfig() {
        log.info("hucoo-module-integration initialized");
    }
}
