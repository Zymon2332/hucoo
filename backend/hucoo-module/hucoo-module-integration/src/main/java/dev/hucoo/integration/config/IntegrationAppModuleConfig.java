package dev.hucoo.integration.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JCircuitBreakerFactory;
import dev.hucoo.component.log.context.TaskContext;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration(proxyBeanMethods = false)
@EnableFeignClients(basePackages = "dev.hucoo.integration")
@ConditionalOnProperty(prefix = "agent-platform.modules.integration", name = "enabled", havingValue = "true", matchIfMissing = true)
public class IntegrationAppModuleConfig {

    @Bean(destroyMethod = "close")
    ExecutorService integrationCircuitBreakerExecutor(TaskContext context) {
        return context.wrapExecutorService(Executors.newVirtualThreadPerTaskExecutor());
    }

    @Bean
    Customizer<Resilience4JCircuitBreakerFactory> integrationCircuitBreakerContext(
            @Qualifier("integrationCircuitBreakerExecutor") ExecutorService executor) {
        return factory -> factory.configureExecutorService(executor);
    }

    private static final Logger log = LoggerFactory.getLogger(IntegrationAppModuleConfig.class);

    public IntegrationAppModuleConfig() {
        log.info("hucoo-module-integration initialized");
    }
}
