package dev.hucoo.component.log.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import dev.hucoo.component.log.filter.TraceResponseFilter;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.DispatcherType;
import org.springframework.web.filter.OncePerRequestFilter;

@AutoConfiguration(after = LogAutoConfiguration.class)
@ConditionalOnClass(OncePerRequestFilter.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ServletLogAutoConfiguration {
    @Bean
    FilterRegistrationBean<TraceResponseFilter> traceResponseFilter(Tracer tracer) {
        var registration = new FilterRegistrationBean<>(new TraceResponseFilter(tracer));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        registration.setAsyncSupported(true);
        registration.setDispatcherTypes(DispatcherType.REQUEST, DispatcherType.ASYNC, DispatcherType.ERROR);
        return registration;
    }
}
