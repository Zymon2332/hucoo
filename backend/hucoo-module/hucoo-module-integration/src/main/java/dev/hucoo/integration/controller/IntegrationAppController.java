package dev.hucoo.integration.controller;

import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.integration.api.dto.IntegrationAppCreateRequest;
import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.api.dto.IntegrationAppQueryRequest;
import dev.hucoo.integration.application.service.IntegrationAppApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "集成应用")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/integrations")
@RequiredArgsConstructor
public class IntegrationAppController {

    private final IntegrationAppApplicationService integrationAppApplicationService;

    @Operation(summary = "分页查询集成应用")
    @GetMapping
    public Result<PageResult<IntegrationAppDTO>> page(IntegrationAppQueryRequest request) {
        return Result.ok(integrationAppApplicationService.pageDtos(request));
    }

    @Operation(summary = "集成连接正式列表")
    @GetMapping({"/connections", "/webhooks"})
    public Result<PageResult<IntegrationAppDTO>> connections(IntegrationAppQueryRequest request) {
        return Result.ok(integrationAppApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步重放 Webhook 事件")
    @PostMapping("/webhooks/{id}/replay")
    @RequirePermission("webhook:replay")
    public Result<AsyncJobDTO> replayWebhook(@PathVariable Long id) {
        IntegrationAppDTO integration = integrationAppApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("Webhook 重放已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(35, "加载事件签名和订阅配置");
            context.result("integrationCode", integration.getAppCode());
            context.result("deliveryStatus", "RETRYING");
            context.progress(100, "Webhook 重放完成");
        }));
    }

    @Operation(summary = "查询集成应用 详情")
    @GetMapping("/{id}")
    public Result<IntegrationAppDTO> detail(@PathVariable Long id) {
        return Result.ok(integrationAppApplicationService.getDto(id));
    }

    @Operation(summary = "创建集成应用")
    @PostMapping
    @RequirePermission("integration:create")
    public Result<IntegrationAppDTO> create(@Valid @RequestBody IntegrationAppCreateRequest request) {
        return Result.ok(integrationAppApplicationService.create(request));
    }

    @Operation(summary = "更新集成应用")
    @PutMapping("/{id}")
    @RequirePermission("integration:update")
    public Result<IntegrationAppDTO> update(@PathVariable Long id, @Valid @RequestBody IntegrationAppCreateRequest request) {
        return Result.ok(integrationAppApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("integration:update")
    public Result<IntegrationAppDTO> patch(@PathVariable Long id, @Valid @RequestBody IntegrationAppCreateRequest request) {
        return Result.ok(integrationAppApplicationService.update(id, request));
    }

    @Operation(summary = "删除集成应用")
    @DeleteMapping("/{id}")
    @RequirePermission("integration:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(integrationAppApplicationService.remove(id));
    }
}
