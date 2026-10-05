package dev.hucoo.modelgovernance.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@org.springframework.boot.context.properties.EnableConfigurationProperties(ModelVaultProperties.class)
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.modelgovernance", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ModelDefinitionModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(ModelDefinitionModuleConfig.class);

    public ModelDefinitionModuleConfig() {
        log.info("module-modelgovernance initialized");
    }
}
