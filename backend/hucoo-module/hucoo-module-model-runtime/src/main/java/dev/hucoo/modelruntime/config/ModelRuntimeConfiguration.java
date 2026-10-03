package dev.hucoo.modelruntime.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.web.reactive.function.client.WebClient;

@AutoConfiguration
@EnableConfigurationProperties(ModelRuntimeProperties.class)
@Import({dev.hucoo.modelruntime.infrastructure.secret.InMemorySecretStore.class,
        dev.hucoo.modelruntime.infrastructure.adapter.OpenAiCompatibleAdapter.class,
        dev.hucoo.modelruntime.infrastructure.adapter.DeepSeekModelProviderAdapter.class,
        dev.hucoo.modelruntime.application.service.ModelInvocationService.class,
        dev.hucoo.modelruntime.controller.ModelRuntimeController.class,
        dev.hucoo.modelruntime.controller.ModelRuntimeAdminController.class,
        dev.hucoo.modelruntime.controller.ModelRuntimeExceptionHandler.class})
public class ModelRuntimeConfiguration {
    @Bean
    @ConditionalOnMissingBean
    WebClient.Builder modelRuntimeWebClientBuilder() {
        return WebClient.builder();
    }
}
