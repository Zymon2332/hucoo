package dev.hucoo.integration.client;

import org.springframework.context.annotation.Bean;

public class GitProviderClientConfiguration {

    @Bean
    GitProviderClientFallbackFactory gitProviderClientFallbackFactory() {
        return new GitProviderClientFallbackFactory();
    }
}
