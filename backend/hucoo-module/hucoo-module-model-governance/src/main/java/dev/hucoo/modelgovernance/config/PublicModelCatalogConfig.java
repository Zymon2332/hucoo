package dev.hucoo.modelgovernance.config;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import dev.hucoo.modelgovernance.domain.ModelCatalogReleasePolicy;
import dev.hucoo.modelgovernance.domain.StableModelCatalogPolicy;

@Configuration(proxyBeanMethods = false)
public class PublicModelCatalogConfig {
    @Bean
    @ConditionalOnMissingBean(ModelCatalogReleasePolicy.class)
    public ModelCatalogReleasePolicy modelCatalogReleasePolicy() {
        return new StableModelCatalogPolicy();
    }

    @Bean("modelCatalogClock")
    public Clock modelCatalogClock() {
        return Clock.systemDefaultZone();
    }
}
