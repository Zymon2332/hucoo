package dev.hucoo.component.log.config;

import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Defaults must be available before the logging system and auto-configuration start.
 */
public final class LogEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        environment.getPropertySources().addLast(new MapPropertySource("hucooLogDefaults", Map.of(
                "management.tracing.propagation.consume", "W3C",
                "management.tracing.propagation.produce", "W3C",
                "spring.reactor.context-propagation", "auto",
                "spring.task.execution.mode", "force",
                "logging.structured.json.context.include", "false",
                "logging.structured.json.customizer", "dev.hucoo.component.log.json.TraceJsonMembersCustomizer")));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
