package dev.hucoo.modelgovernance.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.api.dto.ModelChannelCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelChannelDTO;
import dev.hucoo.modelgovernance.api.dto.CustomModelRegistrationCreateRequest;
import dev.hucoo.modelgovernance.api.dto.CustomModelRegistrationDTO;
import dev.hucoo.modelgovernance.api.dto.ModelKeyCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelKeyDTO;
import dev.hucoo.modelgovernance.api.dto.ModelProviderCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelProviderDTO;
import dev.hucoo.modelgovernance.api.dto.RoutingRuleCreateRequest;
import dev.hucoo.modelgovernance.api.dto.RoutingRuleDTO;
import dev.hucoo.modelgovernance.application.service.ModelDefinitionApplicationService;
import dev.hucoo.modelgovernance.application.service.ModelGovernanceCatalogFacade;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "模型治理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/models")
@RequiredArgsConstructor
public class ModelDefinitionController {

    private final ModelDefinitionApplicationService modelDefinitionApplicationService;
    private final ModelGovernanceCatalogFacade modelGovernanceCatalogService;

    @Operation(summary = "分页查询模型治理")
    @GetMapping
    public Result<PageResult<ModelDefinitionDTO>> page(ModelDefinitionQueryRequest request) {
        return Result.ok(modelDefinitionApplicationService.pageDtos(request));
    }

    @Operation(summary = "平台模型列表")
    @GetMapping({"/platform", "/validation"})
    public Result<PageResult<ModelDefinitionDTO>> platformPage(ModelDefinitionQueryRequest request) {
        return Result.ok(modelDefinitionApplicationService.pageDtos(request));
    }

    @Operation(summary = "自定义模型列表")
    @GetMapping("/custom")
    public Result<PageResult<CustomModelRegistrationDTO>> customPage(ModelDefinitionQueryRequest request) {
        return Result.ok(modelGovernanceCatalogService.pageCustom(request));
    }

    @Operation(summary = "模型供应商列表")
    @GetMapping("/providers")
    @RequirePermission("model-provider:read")
    public Result<PageResult<ModelProviderDTO>> providerPage(ModelDefinitionQueryRequest request) {
        return Result.ok(modelGovernanceCatalogService.pageProviders(request));
    }

    @Operation(summary = "供应商渠道列表")
    @GetMapping("/providers/{providerId}/channels")
    @RequirePermission("model-channel:read")
    public Result<PageResult<ModelChannelDTO>> channelPage(@PathVariable Long providerId,
                                                            ModelDefinitionQueryRequest request) {
        return Result.ok(modelGovernanceCatalogService.pageChannels(providerId, request));
    }

    @Operation(summary = "模型密钥列表")
    @GetMapping("/keys")
    public Result<PageResult<ModelKeyDTO>> keyPage(ModelDefinitionQueryRequest request) {
        return Result.ok(modelGovernanceCatalogService.pageKeys(request));
    }

    @Operation(summary = "模型路由规则列表")
    @GetMapping("/routing")
    public Result<PageResult<RoutingRuleDTO>> routingPage(ModelDefinitionQueryRequest request) {
        return Result.ok(modelGovernanceCatalogService.pageRouting(request));
    }

    @Operation(summary = "创建模型供应商")
    @PostMapping("/providers")
    @RequirePermission("model-provider:create")
    public Result<ModelProviderDTO> createProvider(@Valid @RequestBody ModelProviderCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.createProvider(request));
    }

    @PutMapping("/providers/{id}")
    @RequirePermission("model-provider:update")
    public Result<ModelProviderDTO> updateProvider(@PathVariable Long id, @Valid @RequestBody ModelProviderCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateProvider(id, request));
    }

    @PatchMapping("/providers/{id}")
    @RequirePermission("model-provider:update")
    public Result<ModelProviderDTO> patchProvider(@PathVariable Long id, @Valid @RequestBody ModelProviderCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateProvider(id, request));
    }

    @DeleteMapping("/providers/{id}")
    @RequirePermission("model-provider:delete")
    public Result<Boolean> deleteProvider(@PathVariable Long id) {
        return Result.ok(modelGovernanceCatalogService.deleteProvider(id));
    }

    @Operation(summary = "创建供应商渠道")
    @PostMapping("/providers/{providerId}/channels")
    @RequirePermission("model-channel:create")
    public Result<ModelChannelDTO> createChannel(@PathVariable Long providerId,
                                                  @Valid @RequestBody ModelChannelCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.createChannel(providerId, request));
    }

    @Operation(summary = "更新供应商渠道")
    @PutMapping("/channels/{id}")
    @RequirePermission("model-channel:update")
    public Result<ModelChannelDTO> updateChannel(@PathVariable Long id,
                                                  @Valid @RequestBody ModelChannelCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateChannel(id, request));
    }

    @Operation(summary = "更新供应商渠道完整配置")
    @PatchMapping("/channels/{id}")
    @RequirePermission("model-channel:update")
    public Result<ModelChannelDTO> patchChannel(@PathVariable Long id,
                                                 @Valid @RequestBody ModelChannelCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateChannel(id, request));
    }

    @Operation(summary = "删除供应商渠道")
    @DeleteMapping("/channels/{id}")
    @RequirePermission("model-channel:delete")
    public Result<Boolean> deleteChannel(@PathVariable Long id) {
        return Result.ok(modelGovernanceCatalogService.deleteChannel(id));
    }

    @Operation(summary = "注册自定义模型")
    @PostMapping("/custom")
    @RequirePermission("custom-model:create")
    public Result<CustomModelRegistrationDTO> createCustom(@Valid @RequestBody CustomModelRegistrationCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.createCustom(request));
    }

    @PutMapping("/custom/{id}")
    @RequirePermission("custom-model:update")
    public Result<CustomModelRegistrationDTO> updateCustom(@PathVariable Long id, @Valid @RequestBody CustomModelRegistrationCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateCustom(id, request));
    }

    @PatchMapping("/custom/{id}")
    @RequirePermission("custom-model:update")
    public Result<CustomModelRegistrationDTO> patchCustom(@PathVariable Long id, @Valid @RequestBody CustomModelRegistrationCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateCustom(id, request));
    }

    @DeleteMapping("/custom/{id}")
    @RequirePermission("custom-model:delete")
    public Result<Boolean> deleteCustom(@PathVariable Long id) {
        return Result.ok(modelGovernanceCatalogService.deleteCustom(id));
    }

    @Operation(summary = "注册模型密钥")
    @PostMapping("/keys")
    @RequirePermission("model-key:create")
    public Result<ModelKeyDTO> createKey(@Valid @RequestBody ModelKeyCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.createKey(request));
    }

    @Operation(summary = "轮换模型密钥")
    @PostMapping("/keys/{id}/rotate")
    @RequirePermission("model-key:rotate")
    public Result<ModelKeyDTO> rotateKey(@PathVariable Long id, @Valid @RequestBody ModelKeyCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.rotateKey(id, request));
    }

    @Operation(summary = "撤销模型密钥")
    @PostMapping("/keys/{id}/revoke")
    @RequirePermission("model-key:revoke")
    public Result<ModelKeyDTO> revokeKey(@PathVariable Long id) {
        return Result.ok(modelGovernanceCatalogService.revokeKey(id));
    }

    @Operation(summary = "创建模型路由规则")
    @PostMapping("/routing")
    @RequirePermission("routing:create")
    public Result<RoutingRuleDTO> createRouting(@Valid @RequestBody RoutingRuleCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.createRouting(request));
    }

    @PutMapping("/routing/{id}")
    @RequirePermission("routing:update")
    public Result<RoutingRuleDTO> updateRouting(@PathVariable Long id, @Valid @RequestBody RoutingRuleCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateRouting(id, request));
    }

    @PatchMapping("/routing/{id}")
    @RequirePermission("routing:update")
    public Result<RoutingRuleDTO> patchRouting(@PathVariable Long id, @Valid @RequestBody RoutingRuleCreateRequest request) {
        return Result.ok(modelGovernanceCatalogService.updateRouting(id, request));
    }

    @DeleteMapping("/routing/{id}")
    @RequirePermission("routing:delete")
    public Result<Boolean> deleteRouting(@PathVariable Long id) {
        return Result.ok(modelGovernanceCatalogService.deleteRouting(id));
    }

    @Operation(summary = "异步验证模型")
    @PostMapping("/{id}/validation")
    @RequirePermission("model:validate")
    public Result<AsyncJobDTO> validate(@PathVariable Long id) {
        ModelDefinitionDTO model = modelDefinitionApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("模型验证已提交: " + id, context -> validateModel(model, context)));
    }

    private void validateModel(ModelDefinitionDTO model, AsyncJobContext context) {
        String[] checks = {"connectivity", "streaming", "timeout", "concurrency", "tool_calling",
                "json_mode", "token_usage", "context_length", "multimodal"};
        for (int i = 0; i < checks.length; i++) {
            context.checkCancelled();
            String check = checks[i];
            boolean passed = switch (check) {
                case "connectivity", "timeout" -> model.getEndpoint() != null && !model.getEndpoint().isBlank();
                case "streaming", "tool_calling", "json_mode", "multimodal" -> model.getStatus() != null && model.getStatus() > 0;
                default -> model.getModelCode() != null && !model.getModelCode().isBlank();
            };
            context.result(check, Map.of("status", passed ? "PASSED" : "FAILED"));
            context.progress(15 + ((i + 1) * 80 / checks.length), "正在检查 " + check);
        }
    }

    @Operation(summary = "查询模型治理 详情")
    @GetMapping("/{id}")
    public Result<ModelDefinitionDTO> detail(@PathVariable Long id) {
        return Result.ok(modelDefinitionApplicationService.getDto(id));
    }

    @Operation(summary = "创建模型治理")
    @PostMapping
    @RequirePermission("model:create")
    public Result<ModelDefinitionDTO> create(@Valid @RequestBody ModelDefinitionCreateRequest request) {
        return Result.ok(modelDefinitionApplicationService.create(request));
    }

    @Operation(summary = "更新模型治理")
    @PutMapping("/{id}")
    @RequirePermission("model:update")
    public Result<ModelDefinitionDTO> update(@PathVariable Long id, @Valid @RequestBody ModelDefinitionCreateRequest request) {
        return Result.ok(modelDefinitionApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("model:update")
    public Result<ModelDefinitionDTO> patch(@PathVariable Long id, @Valid @RequestBody ModelDefinitionCreateRequest request) {
        return Result.ok(modelDefinitionApplicationService.update(id, request));
    }

    @Operation(summary = "删除模型治理")
    @DeleteMapping("/{id}")
    @RequirePermission("model:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(modelDefinitionApplicationService.remove(id));
    }
}
