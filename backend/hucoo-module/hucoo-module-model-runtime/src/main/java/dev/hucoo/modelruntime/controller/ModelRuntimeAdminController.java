package dev.hucoo.modelruntime.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.modelruntime.api.dto.AccountCreateRequest;
import dev.hucoo.modelruntime.api.dto.AccountDTO;
import dev.hucoo.modelruntime.api.dto.RoutePreviewDTO;
import dev.hucoo.modelruntime.api.dto.RotateAccountRequest;
import dev.hucoo.modelruntime.api.dto.BalanceUpdateRequest;
import dev.hucoo.modelruntime.application.service.ModelInvocationService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import dev.hucoo.component.security.annotation.RequirePermission;

@RestController
@Tag(name = "模型运行时管理")
@RequestMapping(PlatformConstants.API_PREFIX + "/models")
public class ModelRuntimeAdminController {
    private final ModelInvocationService service;
    public ModelRuntimeAdminController(ModelInvocationService service) { this.service = service; }
    @GetMapping("/accounts")
    @Operation(summary = "查询模型账户")
    @RequirePermission("model-account:read")
    public Result<List<AccountDTO>> accounts(@RequestParam(required = false) String model) { return Result.ok(service.accounts(model)); }
    @PostMapping("/accounts")
    @Operation(summary = "创建模型账户")
    @RequirePermission("model-account:create")
    public Result<AccountDTO> create(@Valid @RequestBody AccountCreateRequest request) { return Result.ok(service.createAccount(request)); }
    @PostMapping("/accounts/{id}/status/{status}")
    @Operation(summary = "更新账户状态")
    @RequirePermission("model-account:operate")
    public Result<AccountDTO> status(@PathVariable Long id, @PathVariable String status) { return Result.ok(service.updateStatus(id, status)); }
    @PostMapping("/accounts/{id}/circuit-reset")
    @Operation(summary = "重置账户熔断")
    @RequirePermission("model-account:operate")
    public Result<AccountDTO> resetCircuit(@PathVariable Long id) { return Result.ok(service.resetCircuit(id)); }
    @PostMapping("/accounts/{id}/rotate")
    @Operation(summary = "轮换账户密钥")
    @RequirePermission("model-account:rotate")
    public Result<AccountDTO> rotate(@PathVariable Long id, @Valid @RequestBody RotateAccountRequest request) { return Result.ok(service.rotate(id, request)); }
    @PostMapping("/accounts/{id}/revoke")
    @Operation(summary = "撤销账户密钥")
    @RequirePermission("model-account:revoke")
    public Result<AccountDTO> revoke(@PathVariable Long id) { return Result.ok(service.updateStatus(id, "REVOKED")); }
    @PostMapping("/accounts/{id}/balance")
    @Operation(summary = "更新账户余额")
    @RequirePermission("model-account:operate")
    public Result<AccountDTO> balance(@PathVariable Long id, @Valid @RequestBody BalanceUpdateRequest request) { return Result.ok(service.updateBalance(id, request)); }
    @org.springframework.web.bind.annotation.DeleteMapping("/accounts/{id}")
    @RequirePermission("model-account:delete")
    public Result<Boolean> delete(@PathVariable Long id) { return Result.ok(service.delete(id)); }
    @GetMapping("/pools/{model}/preview")
    @Operation(summary = "预览模型路由池")
    @RequirePermission("model-route:read")
    public Result<RoutePreviewDTO> preview(@PathVariable String model) { return Result.ok(service.preview(model)); }
}
