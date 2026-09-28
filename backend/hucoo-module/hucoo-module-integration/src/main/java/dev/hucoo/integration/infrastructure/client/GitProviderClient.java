package dev.hucoo.integration.infrastructure.client;

import java.util.Map;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "git-provider",
        url = "${agent-platform.integration.git.base-url:http://127.0.0.1:9999}",
        fallbackFactory = GitProviderClientFallbackFactory.class)
public interface GitProviderClient {

    @GetMapping("/repos/{owner}/{repo}")
    Map<String, Object> getRepository(@PathVariable("owner") String owner, @PathVariable("repo") String repo);
}
