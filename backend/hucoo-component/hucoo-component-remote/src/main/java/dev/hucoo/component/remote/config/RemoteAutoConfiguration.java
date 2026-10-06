package dev.hucoo.component.remote.config;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JCircuitBreakerFactory;
import org.springframework.cloud.client.circuitbreaker.Customizer;

import dev.hucoo.component.remote.RemoteFeignErrorDecoder;
import dev.hucoo.component.remote.RemoteFeignHeaderInterceptor;
import dev.hucoo.component.remote.RemoteHeaderContextAccessor;
import dev.hucoo.component.log.context.TaskContext;

import feign.Logger;
import feign.RequestInterceptor;
import feign.codec.ErrorDecoder;

@AutoConfiguration(beforeName = "dev.hucoo.component.log.config.LogAutoConfiguration")
@ConditionalOnClass(RequestInterceptor.class)
public class RemoteAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(RemoteFeignHeaderInterceptor.class)
    RequestInterceptor remoteFeignHeaderInterceptor() {
        return new RemoteFeignHeaderInterceptor();
    }

    @Bean
    @ConditionalOnMissingBean
    RemoteHeaderContextAccessor remoteHeaderContextAccessor() {
        return new RemoteHeaderContextAccessor();
    }

    @Bean
    @ConditionalOnMissingBean
    ErrorDecoder remoteFeignErrorDecoder() {
        return new RemoteFeignErrorDecoder();
    }

    /** Use one predictable Feign log level; category filtering remains application-controlled. */
    @Bean
    @ConditionalOnMissingBean
    Logger.Level remoteFeignLoggerLevel() {
        return Logger.Level.BASIC;
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnClass(Resilience4JCircuitBreakerFactory.class)
    @ConditionalOnMissingBean(name = "remoteCircuitBreakerExecutor")
    ExecutorService remoteCircuitBreakerExecutor(TaskContext taskContext) {
        return taskContext.wrapExecutorService(Executors.newVirtualThreadPerTaskExecutor());
    }

    @Bean
    @ConditionalOnClass(Resilience4JCircuitBreakerFactory.class)
    @ConditionalOnBean(name = "remoteCircuitBreakerExecutor")
    Customizer<Resilience4JCircuitBreakerFactory> remoteCircuitBreakerContext(
            @Qualifier("remoteCircuitBreakerExecutor") ExecutorService remoteCircuitBreakerExecutor) {
        return factory -> factory.configureExecutorService(remoteCircuitBreakerExecutor);
    }
}
