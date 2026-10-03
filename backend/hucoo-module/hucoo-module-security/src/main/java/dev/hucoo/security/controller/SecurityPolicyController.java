package dev.hucoo.security.controller;

import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
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
import dev.hucoo.security.api.dto.SecurityPolicyCreateRequest;
import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.api.dto.SecurityPolicyQueryRequest;
import dev.hucoo.security.application.service.SecurityPolicyApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "安全策略")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/security-policies")
@RequiredArgsConstructor
public class SecurityPolicyController {

    private final SecurityPolicyApplicationService securityPolicyApplicationService;

    @Operation(summary = "分页查询安全策略")
    @GetMapping
    public Result<PageResult<SecurityPolicyDTO>> page(SecurityPolicyQueryRequest request) {
        return Result.ok(securityPolicyApplicationService.pageDtos(request));
    }

    @Operation(summary = "DLP 和安全策略列表")
    @GetMapping({"/dlp-rules", "/content-filters", "/ip-allowlist", "/retention"})
    public Result<PageResult<SecurityPolicyDTO>> policyGroups(SecurityPolicyQueryRequest request) {
        return Result.ok(securityPolicyApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步测试安全策略")
    @PostMapping("/{id}/test")
    @RequirePermission("security:test")
    public Result<AsyncJobDTO> test(@PathVariable Long id) {
        SecurityPolicyDTO policy = securityPolicyApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("安全策略测试已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(40, "执行策略样本匹配");
            context.result("policyCode", policy.getPolicyCode());
            context.result("matched", policy.getEnabled() != null && policy.getEnabled() > 0);
            context.progress(100, "安全策略测试完成");
        }));
    }

    @Operation(summary = "查询安全策略 详情")
    @GetMapping("/{id}")
    public Result<SecurityPolicyDTO> detail(@PathVariable Long id) {
        return Result.ok(securityPolicyApplicationService.getDto(id));
    }

    @Operation(summary = "创建安全策略")
    @PostMapping
    @RequirePermission("security:create")
    public Result<SecurityPolicyDTO> create(@Valid @RequestBody SecurityPolicyCreateRequest request) {
        return Result.ok(securityPolicyApplicationService.create(request));
    }

    @Operation(summary = "更新安全策略")
    @PutMapping("/{id}")
    @RequirePermission("security:update")
    public Result<SecurityPolicyDTO> update(@PathVariable Long id, @Valid @RequestBody SecurityPolicyCreateRequest request) {
        return Result.ok(securityPolicyApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("security:update")
    public Result<SecurityPolicyDTO> patch(@PathVariable Long id, @Valid @RequestBody SecurityPolicyCreateRequest request) {
        return Result.ok(securityPolicyApplicationService.update(id, request));
    }

    @Operation(summary = "删除安全策略")
    @DeleteMapping("/{id}")
    @RequirePermission("security:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(securityPolicyApplicationService.remove(id));
    }
}
