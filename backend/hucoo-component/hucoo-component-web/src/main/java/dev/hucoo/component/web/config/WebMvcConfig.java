package dev.hucoo.component.web.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import dev.hucoo.commons.api.PlatformConstants;

@Configuration(proxyBeanMethods = false)
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD")
                .allowedHeaders("*")
                // 文件下载需要前端读到文件名与长度，否则 XHR/fetch 拿不到这两个响应头
                .exposedHeaders(PlatformConstants.TRACE_ID_HEADER,
                        HttpHeaders.CONTENT_DISPOSITION,
                        HttpHeaders.CONTENT_LENGTH)
                .allowCredentials(true)
                .maxAge(3600);
    }
}
