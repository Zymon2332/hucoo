package dev.hucoo.component.log.config;

import java.util.ArrayList;
import java.util.List;
import java.util.function.UnaryOperator;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.component.log.context.ContextRegistrations;
import dev.hucoo.component.log.context.LoggingMdcAccessor;
import dev.hucoo.component.log.context.TaskContext;
import io.micrometer.context.ContextRegistry;
import io.micrometer.context.ContextSnapshotFactory;
import io.micrometer.context.ThreadLocalAccessor;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.contextpropagation.ObservationAwareSpanThreadLocalAccessor;

@AutoConfiguration(afterName = {
        "org.springframework.boot.micrometer.tracing.brave.autoconfigure.BraveAutoConfiguration",
        "org.springframework.boot.micrometer.observation.autoconfigure.ObservationAutoConfiguration"},
        beforeName = "org.springframework.boot.autoconfigure.task.TaskExecutionAutoConfiguration")
@EnableAsync
public class LogAutoConfiguration {
    @Bean(destroyMethod = "close")
    ContextRegistrations logContextRegistrations(ObservationRegistry observations, Tracer tracer,
                                                 ObjectProvider<ThreadLocalAccessor<?>> customAccessors) {
        List<ThreadLocalAccessor<?>> accessors = new ArrayList<>();
        accessors.add(new ObservationThreadLocalAccessor(observations));
        accessors.add(new ObservationAwareSpanThreadLocalAccessor(observations, tracer));
        accessors.add(new LoggingMdcAccessor());
        customAccessors.orderedStream().forEach(accessors::add);
        return new ContextRegistrations(ContextRegistry.getInstance(), accessors);
    }

    @Bean
    @ConditionalOnMissingBean
    TaskContext taskContext(ContextRegistrations registrations, ObservationRegistry observations) {
        return new TaskContext(ContextSnapshotFactory.builder().contextRegistry(ContextRegistry.getInstance())
                .clearMissing(true).build(), observations);
    }

    @Bean
    @Order(Ordered.LOWEST_PRECEDENCE)
    TaskDecorator loggingTaskDecorator(TaskContext context) {
        return action -> context.task("async.task", action);
    }

    @Bean
    DisposableBean asyncJobLoggingRegistration(TaskContext context) {
        UnaryOperator<Runnable> decorator = action -> context.task("admin.job", action);
        UnaryOperator<Runnable> previous = AsyncJobExecutor.setTaskDecorator(decorator);
        return () -> AsyncJobExecutor.restoreTaskDecorator(decorator, previous);
    }
}
