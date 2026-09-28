package dev.hucoo.integration.infrastructure.client;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

@Component
public class GitProviderClientFallbackFactory implements FallbackFactory<GitProviderClient> {

    private static final Logger log = LoggerFactory.getLogger(GitProviderClientFallbackFactory.class);

    @Override
    public GitProviderClient create(Throwable cause) {
        return (owner, repo) -> {
            log.warn("git provider fallback triggered: owner={}, repo={}, reason={}", owner, repo, cause.getMessage());
            return Map.of(
                    "owner", owner,
                    "repo", repo,
                    "fallback", Boolean.TRUE,
                    "reason", cause.getMessage() == null ? "unknown" : cause.getMessage());
        };
    }
}
