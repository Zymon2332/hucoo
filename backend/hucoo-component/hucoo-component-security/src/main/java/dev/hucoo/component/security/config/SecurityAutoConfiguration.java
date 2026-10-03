package dev.hucoo.component.security.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.ApplicationContext;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import dev.hucoo.component.security.interceptor.PermissionInterceptor;
import dev.hucoo.component.security.interceptor.PermissionResolver;
import dev.hucoo.component.security.util.JwtUtil;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnClass(WebMvcConfigurer.class)
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityAutoConfiguration implements WebMvcConfigurer {

    private final SecurityProperties securityProperties;
    private final ApplicationContext applicationContext;

    public SecurityAutoConfiguration(SecurityProperties securityProperties, ApplicationContext applicationContext) {
        this.securityProperties = securityProperties;
        this.applicationContext = applicationContext;
    }

    @Bean
    @ConditionalOnMissingBean
    public JwtUtil jwtUtil() {
        return new JwtUtil(securityProperties.getJwtSecret(), securityProperties.getJwtKeyId());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new PermissionInterceptor(
                        securityProperties,
                        new JwtUtil(securityProperties.getJwtSecret(), securityProperties.getJwtKeyId()),
                        applicationContext.getBeanProvider(PermissionResolver.class)))
                .addPathPatterns("/**")
                .order(0);
    }

}
