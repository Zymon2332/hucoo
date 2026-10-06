package dev.hucoo.modelruntime.client;

import org.springframework.context.annotation.Bean;

/** Feign-specific fallback configuration for the model runtime service. */
public class ModelRuntimeClientConfiguration {

    @Bean
    ModelRuntimeFallbackFactory modelRuntimeFallbackFactory() {
        return new ModelRuntimeFallbackFactory();
    }
}
