package dev.hucoo.toolmcp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.toolmcp", name = "enabled", havingValue = "true", matchIfMissing = true)
public class McpServerRegistrationModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(McpServerRegistrationModuleConfig.class);

    public McpServerRegistrationModuleConfig() {
        log.info("module-toolmcp initialized");
    }
}
