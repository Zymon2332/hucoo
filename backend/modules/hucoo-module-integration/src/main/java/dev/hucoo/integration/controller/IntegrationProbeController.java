package dev.hucoo.integration.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.integration.infrastructure.client.GitProviderClient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "集成探针")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/integrations/probe")
@RequiredArgsConstructor
public class IntegrationProbeController {

    private final GitProviderClient gitProviderClient;

    @Operation(summary = "探活 Git Provider（演示 OpenFeign + Resilience4j 降级）")
    @GetMapping("/git/repos/{owner}/{repo}")
    public Result<Map<String, Object>> probeGitRepository(@PathVariable String owner, @PathVariable String repo) {
        return Result.ok(gitProviderClient.getRepository(owner, repo));
    }
}
