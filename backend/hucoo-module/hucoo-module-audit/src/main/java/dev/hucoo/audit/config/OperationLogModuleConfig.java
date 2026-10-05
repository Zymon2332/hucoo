package dev.hucoo.audit.config;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import dev.hucoo.audit.api.OperationLogPublisher;
import dev.hucoo.audit.application.AuditLogRetentionService;
import dev.hucoo.audit.application.OperationLogPublisherImpl;
import dev.hucoo.audit.application.service.AuditLogApplicationService;
import dev.hucoo.audit.infrastructure.OperationLogInterceptor;
import dev.hucoo.audit.infrastructure.mapper.AuditLogMapper;

import io.micrometer.core.instrument.MeterRegistry;
import dev.hucoo.component.log.context.TaskContext;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(OperationLogProperties.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperties({
        @ConditionalOnProperty(prefix = "agent-platform.modules.audit", name = "enabled",
                havingValue = "true", matchIfMissing = true),
        @ConditionalOnProperty(prefix = "agent-platform.modules.audit.operation-log", name = "enabled",
                havingValue = "true", matchIfMissing = true)
})
public class OperationLogModuleConfig {

    @Bean(destroyMethod = "shutdown")
    public ThreadPoolExecutor operationLogExecutor(OperationLogProperties properties) {
        int queueCapacity = Math.max(1, properties.getQueueCapacity());
        return new ThreadPoolExecutor(
                1,
                2,
                60L,
                TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(queueCapacity),
                runnable -> {
                    Thread thread = new Thread(runnable, "hucoo-operation-log");
                    thread.setDaemon(true);
                    return thread;
                });
    }

    @Bean
    public OperationLogPublisher operationLogPublisher(AuditLogApplicationService service,
                                                        ThreadPoolExecutor executor,
                                                        ObjectProvider<MeterRegistry> meterRegistry, TaskContext taskContext) {
        return new OperationLogPublisherImpl(service, executor, meterRegistry, taskContext);
    }

    @Bean
    public OperationLogInterceptor operationLogInterceptor(OperationLogProperties properties,
                                                           OperationLogPublisher publisher) {
        return new OperationLogInterceptor(properties, publisher);
    }

    @Bean
    @ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
    public AuditLogRetentionService auditLogRetentionService(AuditLogMapper auditLogMapper,
                                                              OperationLogProperties properties) {
        return new AuditLogRetentionService(auditLogMapper, properties);
    }

    @Bean
    public WebMvcConfigurer operationLogWebMvcConfigurer(OperationLogInterceptor interceptor) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(interceptor)
                        .addPathPatterns("/**")
                        .order(-100);
            }
        };
    }
}
