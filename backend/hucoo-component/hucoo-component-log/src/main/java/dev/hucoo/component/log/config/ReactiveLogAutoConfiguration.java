package dev.hucoo.component.log.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.server.WebFilter;
import dev.hucoo.component.log.filter.TraceResponseWebFilter;
import io.micrometer.tracing.Tracer;

@AutoConfiguration(after = LogAutoConfiguration.class)
@ConditionalOnClass(WebFilter.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveLogAutoConfiguration {
    @Bean
    TraceResponseWebFilter traceResponseWebFilter(Tracer tracer) {
        return new TraceResponseWebFilter(tracer);
    }
}
