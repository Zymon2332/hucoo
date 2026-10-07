package dev.hucoo.modelgovernance.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.application.service.ModelCatalogApplicationService;

/**
 * 规范化模型配置接口；旧 /models 接口继续保留供迁移期兼容。
 */
@Tag(name = "模型目录与渠道配置")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/model-catalog")
@RequiredArgsConstructor
public class ModelCatalogController {
    private final ModelCatalogApplicationService service;

    @Operation(summary = "分页查询逻辑模型")
    @GetMapping("/models")
    @RequirePermission("model:read")
    public Result<PageResult<LogicalModelDTO>> models(ModelDefinitionQueryRequest query) {
        return Result.ok(service.models(query));
    }

    @Operation(summary = "查询逻辑模型详情")
    @GetMapping("/models/{id}")
    @RequirePermission("model:read")
    public Result<LogicalModelDTO> model(@PathVariable Long id) {
        return Result.ok(service.model(id));
    }

    @Operation(summary = "创建逻辑模型")
    @PostMapping("/models")
    @RequirePermission("model:create")
    public Result<LogicalModelDTO> createModel(@Valid @RequestBody LogicalModelCreateRequest request) {
        return Result.ok(service.createModel(request));
    }

    @Operation(summary = "更新逻辑模型并重置发布状态")
    @PutMapping("/models/{id}")
    @RequirePermission("model:update")
    public Result<LogicalModelDTO> updateModel(@PathVariable Long id, @Valid @RequestBody LogicalModelCreateRequest request) {
        return Result.ok(service.updateModel(id, request));
    }

    @Operation(summary = "删除逻辑模型")
    @DeleteMapping("/models/{id}")
    @RequirePermission("model:delete")
    public Result<Boolean> deleteModel(@PathVariable Long id) {
        service.deleteModel(id);
        return Result.ok(true);
    }

    @Operation(summary = "查询模型版本列表")
    @GetMapping("/models/{modelId}/versions")
    @RequirePermission("model-version:read")
    public Result<List<ModelVersionDTO>> versions(@PathVariable Long modelId) {
        return Result.ok(service.versions(modelId));
    }

    @Operation(summary = "创建模型版本")
    @PostMapping("/models/{modelId}/versions")
    @RequirePermission("model-version:create")
    public Result<ModelVersionDTO> createVersion(@PathVariable Long modelId, @Valid @RequestBody ModelVersionCreateRequest request) {
        return Result.ok(service.createVersion(modelId, request));
    }

    @Operation(summary = "更新模型版本并重新进入审核状态")
    @PutMapping("/versions/{id}")
    @RequirePermission("model-version:update")
    public Result<ModelVersionDTO> updateVersion(@PathVariable Long id, @Valid @RequestBody ModelVersionCreateRequest request) {
        return Result.ok(service.updateVersion(id, request));
    }

    @Operation(summary = "删除模型版本")
    @DeleteMapping("/versions/{id}")
    @RequirePermission("model-version:delete")
    public Result<Boolean> deleteVersion(@PathVariable Long id) {
        service.deleteVersion(id);
        return Result.ok(true);
    }

    @Operation(summary = "查询模型渠道映射列表")
    @GetMapping("/versions/{versionId}/bindings")
    @RequirePermission("model-binding:read")
    public Result<List<ModelChannelBindingDTO>> bindings(@PathVariable Long versionId) {
        return Result.ok(service.bindings(versionId));
    }

    @Operation(summary = "创建模型渠道映射")
    @PostMapping("/versions/{versionId}/bindings")
    @RequirePermission("model-binding:create")
    public Result<ModelChannelBindingDTO> createBinding(@PathVariable Long versionId, @Valid @RequestBody ModelChannelBindingCreateRequest request) {
        return Result.ok(service.createBinding(versionId, request));
    }

    @Operation(summary = "更新模型渠道映射并重新进入审核状态")
    @PutMapping("/bindings/{id}")
    @RequirePermission("model-binding:update")
    public Result<ModelChannelBindingDTO> updateBinding(@PathVariable Long id, @Valid @RequestBody ModelChannelBindingCreateRequest request) {
        return Result.ok(service.updateBinding(id, request));
    }

    @Operation(summary = "删除模型渠道映射")
    @DeleteMapping("/bindings/{id}")
    @RequirePermission("model-binding:delete")
    public Result<Boolean> deleteBinding(@PathVariable Long id) {
        service.deleteBinding(id);
        return Result.ok(true);
    }

    @Operation(summary = "查询模型阶梯价格列表")
    @GetMapping("/bindings/{bindingId}/prices")
    @RequirePermission("model-price:read")
    public Result<List<ModelChannelPriceDTO>> prices(@PathVariable Long bindingId) {
        return Result.ok(service.prices(bindingId));
    }

    @Operation(summary = "创建模型阶梯价格")
    @PostMapping("/bindings/{bindingId}/prices")
    @RequirePermission("model-price:create")
    public Result<ModelChannelPriceDTO> createPrice(@PathVariable Long bindingId, @Valid @RequestBody ModelChannelPriceCreateRequest request) {
        return Result.ok(service.createPrice(bindingId, request));
    }

    @Operation(summary = "删除模型阶梯价格")
    @DeleteMapping("/prices/{id}")
    @RequirePermission("model-price:delete")
    public Result<Boolean> deletePrice(@PathVariable Long id) {
        service.deletePrice(id);
        return Result.ok(true);
    }

    @Operation(summary = "查询模型可见性授权列表")
    @GetMapping("/models/{modelId}/grants")
    @RequirePermission("model-grant:read")
    public Result<List<ModelVisibilityGrantDTO>> grants(@PathVariable Long modelId) {
        return Result.ok(service.grants(modelId));
    }

    @Operation(summary = "创建模型可见性授权")
    @PostMapping("/models/{modelId}/grants")
    @RequirePermission("model-grant:create")
    public Result<ModelVisibilityGrantDTO> createGrant(@PathVariable Long modelId, @Valid @RequestBody ModelVisibilityGrantCreateRequest request) {
        return Result.ok(service.createGrant(modelId, request));
    }

    @Operation(summary = "删除模型可见性授权")
    @DeleteMapping("/grants/{id}")
    @RequirePermission("model-grant:delete")
    public Result<Boolean> deleteGrant(@PathVariable Long id) {
        service.deleteGrant(id);
        return Result.ok(true);
    }

    @Operation(summary = "查询模型版本能力声明")
    @GetMapping("/versions/{versionId}/capabilities")
    @RequirePermission("model-version:read")
    public Result<List<ModelVersionCapabilityDTO>> capabilities(@PathVariable Long versionId) {
        return Result.ok(service.capabilities(versionId));
    }

    @Operation(summary = "设置模型版本能力并重置版本发布状态")
    @PutMapping("/versions/{versionId}/capabilities")
    @RequirePermission("model-version:update")
    public Result<ModelVersionCapabilityDTO> setCapability(@PathVariable Long versionId, @Valid @RequestBody ModelVersionCapabilityCreateRequest request) {
        return Result.ok(service.setCapability(versionId, request));
    }

    @Operation(summary = "查询渠道凭证脱敏信息")
    @GetMapping("/channels/{channelId}/credentials")
    @RequirePermission("model-key:read")
    public Result<List<ModelCredentialDTO>> credentials(@PathVariable Long channelId) {
        return Result.ok(service.credentials(channelId));
    }

    @Operation(summary = "加密登记渠道凭证")
    @PostMapping("/channels/{channelId}/credentials")
    @RequirePermission("model-key:create")
    public Result<ModelCredentialDTO> createCredential(@PathVariable Long channelId, @Valid @RequestBody ModelCredentialCreateRequest request) {
        return Result.ok(service.createCredential(channelId, request));
    }

    @Operation(summary = "轮换渠道凭证并记录轮换历史")
    @PostMapping("/credentials/{id}/rotate")
    @RequirePermission("model-key:rotate")
    public Result<ModelCredentialDTO> rotateCredential(@PathVariable Long id, @Valid @RequestBody ModelCredentialRotateRequest request) {
        return Result.ok(service.rotateCredential(id, request));
    }

    @Operation(summary = "撤销渠道凭证")
    @PostMapping("/credentials/{id}/revoke")
    @RequirePermission("model-key:revoke")
    public Result<ModelCredentialDTO> revokeCredential(@PathVariable Long id) {
        return Result.ok(service.revokeCredential(id));
    }

    @Operation(summary = "审核发布模型配置")
    @PostMapping("/{resource}/{id}/approve")
    @RequirePermission("model-config:approve")
    public Result<Boolean> approve(@PathVariable String resource, @PathVariable Long id) {
        service.approve(resource, id);
        return Result.ok(true);
    }
}
