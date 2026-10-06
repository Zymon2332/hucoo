package dev.hucoo.component.remote.config;

import java.util.Map;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/** Applications and per-client configuration can override every default. */
public final class RemoteEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        environment.getPropertySources().addLast(new MapPropertySource("hucooRemoteDefaults", Map.of(
                "spring.cloud.openfeign.circuitbreaker.enabled", "true",
                "spring.cloud.openfeign.client.config.default.connectTimeout", "3000",
                "spring.cloud.openfeign.client.config.default.readTimeout", "5000",
                "spring.cloud.openfeign.micrometer.enabled", "true",
                "resilience4j.timelimiter.configs.default.timeoutDuration", "8s",
                "resilience4j.circuitbreaker.configs.default.slidingWindowSize", "20",
                "resilience4j.circuitbreaker.configs.default.minimumNumberOfCalls", "10",
                "resilience4j.circuitbreaker.configs.default.failureRateThreshold", "50",
                "resilience4j.circuitbreaker.configs.default.waitDurationInOpenState", "30s")));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
