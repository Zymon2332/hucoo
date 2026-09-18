package dev.hucoo.component.web.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import dev.hucoo.component.web.advice.GlobalExceptionHandler;
import dev.hucoo.component.web.advice.ResponseWrapper;
import dev.hucoo.component.web.filter.RequestLogFilter;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({GlobalExceptionHandler.class, ResponseWrapper.class, WebMvcConfig.class, OpenApiConfig.class})
public class WebAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public RequestLogFilter requestLogFilter() {
        return new RequestLogFilter();
    }
}
