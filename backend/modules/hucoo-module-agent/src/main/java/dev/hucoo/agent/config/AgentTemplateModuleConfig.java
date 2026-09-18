package dev.hucoo.agent.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.agent", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AgentTemplateModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(AgentTemplateModuleConfig.class);

    public AgentTemplateModuleConfig() {
        log.info("hucoo-module-agent initialized");
    }
}
