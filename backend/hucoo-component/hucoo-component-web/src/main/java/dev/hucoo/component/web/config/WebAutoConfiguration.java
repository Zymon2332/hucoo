package dev.hucoo.component.web.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import dev.hucoo.component.web.advice.GlobalExceptionHandler;
import dev.hucoo.component.web.advice.ResponseWrapper;
import dev.hucoo.component.web.filter.RequestLogFilter;
import dev.hucoo.component.web.filter.IdempotencyKeyFilter;
import dev.hucoo.commons.util.PlatformJacksonModule;
import tools.jackson.databind.JacksonModule;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({GlobalExceptionHandler.class, ResponseWrapper.class, WebMvcConfig.class})
public class WebAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public RequestLogFilter requestLogFilter() {
        return new RequestLogFilter();
    }

    @Bean
    @ConditionalOnMissingBean
    public IdempotencyKeyFilter idempotencyKeyFilter() {
        return new IdempotencyKeyFilter();
    }

    @Bean
    @ConditionalOnMissingBean(name = "platformJacksonModule")
    public JacksonModule platformJacksonModule() {
        return PlatformJacksonModule.create();
    }
}
