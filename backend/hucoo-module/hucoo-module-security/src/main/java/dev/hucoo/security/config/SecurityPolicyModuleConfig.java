package dev.hucoo.security.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "agent-platform.modules.security", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SecurityPolicyModuleConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityPolicyModuleConfig.class);

    public SecurityPolicyModuleConfig() {
        log.info("hucoo-module-security initialized");
    }
}
