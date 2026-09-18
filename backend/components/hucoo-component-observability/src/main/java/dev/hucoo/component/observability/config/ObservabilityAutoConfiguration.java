package dev.hucoo.component.observability.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;

import dev.hucoo.component.observability.filter.TraceIdFilter;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import io.micrometer.core.instrument.config.MeterFilter;
import io.micrometer.tracing.Tracer;

@AutoConfiguration
@ConditionalOnClass(MeterRegistry.class)
public class ObservabilityAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(name = "commonTagsMeterFilter")
    public MeterFilter commonTagsMeterFilter(@Value("${spring.application.name:application}") String applicationName) {
        return MeterFilter.commonTags(Tags.of("application", applicationName));
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    @ConditionalOnClass(name = "org.springframework.web.filter.OncePerRequestFilter")
    public TraceIdFilter traceIdFilter(ObjectProvider<Tracer> tracerProvider) {
        return new TraceIdFilter(tracerProvider);
    }
}
