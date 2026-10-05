package dev.hucoo.modelruntime.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.webclient.WebClientCustomizer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Scope;
import org.springframework.web.reactive.function.client.WebClient;

@AutoConfiguration(afterName = "org.springframework.boot.webclient.autoconfigure.WebClientAutoConfiguration")
@EnableConfigurationProperties(ModelRuntimeProperties.class)
@Import({dev.hucoo.modelruntime.infrastructure.secret.InMemorySecretStore.class,
        dev.hucoo.modelruntime.infrastructure.adapter.OpenAiCompatibleAdapter.class,
        dev.hucoo.modelruntime.infrastructure.adapter.DeepSeekModelProviderAdapter.class,
        dev.hucoo.modelruntime.application.service.ModelInvocationService.class,
        dev.hucoo.modelruntime.controller.ModelRuntimeController.class,
        dev.hucoo.modelruntime.controller.ModelRuntimeAdminController.class,
        dev.hucoo.modelruntime.controller.ModelRuntimeExceptionHandler.class})
public class ModelRuntimeConfiguration {

    /**
     * Keeps the model client usable when an application explicitly excludes Boot's
     * WebClientAutoConfiguration (a common setup in servlet-only applications).
     *
     * <p>The normal Boot auto-configuration wins because this bean is conditional.
     * Applying the available customizers here is important: it retains Boot's
     * observation/tracing and HTTP connector customizations instead of creating a
     * plain, uninstrumented client.</p>
     */
    @Bean
    @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
    @ConditionalOnMissingBean(WebClient.Builder.class)
    WebClient.Builder modelRuntimeWebClientBuilder(ObjectProvider<WebClientCustomizer> customizers) {
        WebClient.Builder builder = WebClient.builder();
        customizers.orderedStream().forEach(customizer -> customizer.customize(builder));
        return builder;
    }
}
