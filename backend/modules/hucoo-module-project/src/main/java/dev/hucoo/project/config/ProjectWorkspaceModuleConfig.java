package dev.hucoo.project.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.project", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ProjectWorkspaceModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(ProjectWorkspaceModuleConfig.class);

    public ProjectWorkspaceModuleConfig() {
        log.info("hucoo-module-project initialized");
    }
}
