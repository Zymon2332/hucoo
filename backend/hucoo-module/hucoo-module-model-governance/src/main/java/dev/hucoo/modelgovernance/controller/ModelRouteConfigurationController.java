package dev.hucoo.modelgovernance.controller;

import java.util.List;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.application.service.ModelRouteConfigurationService;

@RestController
@Tag(name = "模型路由配置")
@RequestMapping(PlatformConstants.API_PREFIX + "/model-catalog")
@RequiredArgsConstructor
public class ModelRouteConfigurationController {
    private final ModelRouteConfigurationService service;

    @Operation(summary = "查询逻辑模型的路由策略")
    @GetMapping("/models/{modelId}/route-policies")
    @RequirePermission("routing:read")
    public Result<List<ModelRoutePolicyDTO>> policies(@PathVariable Long modelId) { return Result.ok(service.policies(modelId)); }

    @Operation(summary = "创建逻辑模型的路由策略")
    @PostMapping("/models/{modelId}/route-policies")
    @RequirePermission("routing:create")
    public Result<ModelRoutePolicyDTO> createPolicy(@PathVariable Long modelId, @Valid @RequestBody ModelRoutePolicyCreateRequest request) { return Result.ok(service.createPolicy(modelId, request)); }

    @Operation(summary = "删除模型路由策略")
    @DeleteMapping("/route-policies/{id}")
    @RequirePermission("routing:delete")
    public Result<Boolean> deletePolicy(@PathVariable Long id) { service.deletePolicy(id); return Result.ok(true); }

    @Operation(summary = "查询策略的渠道路由目标")
    @GetMapping("/route-policies/{policyId}/targets")
    @RequirePermission("routing:read")
    public Result<List<ModelRouteTargetDTO>> targets(@PathVariable Long policyId) { return Result.ok(service.targets(policyId)); }

    @Operation(summary = "添加策略的渠道路由目标")
    @PostMapping("/route-policies/{policyId}/targets")
    @RequirePermission("routing:create")
    public Result<ModelRouteTargetDTO> createTarget(@PathVariable Long policyId, @Valid @RequestBody ModelRouteTargetCreateRequest request) { return Result.ok(service.createTarget(policyId, request)); }

    @Operation(summary = "删除渠道路由目标")
    @DeleteMapping("/route-targets/{id}")
    @RequirePermission("routing:delete")
    public Result<Boolean> deleteTarget(@PathVariable Long id) { service.deleteTarget(id); return Result.ok(true); }
}
