package dev.hucoo.identity.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthenticationProperties.class)
@ConditionalOnProperty(prefix = "agent-platform.modules.identity", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AuthenticationModuleConfig {
}
