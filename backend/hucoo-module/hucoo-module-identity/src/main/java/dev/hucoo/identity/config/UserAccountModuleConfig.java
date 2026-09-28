package dev.hucoo.identity.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.identity", name = "enabled", havingValue = "true", matchIfMissing = true)
public class UserAccountModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(UserAccountModuleConfig.class);

    public UserAccountModuleConfig() {
        log.info("hucoo-module-identity initialized");
    }
}
