package dev.hucoo.tenant.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.tenant.api.dto.TenantCreateRequest;
import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.api.dto.TenantQueryRequest;
import dev.hucoo.tenant.application.service.TenantApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "租户管理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantApplicationService tenantApplicationService;

    @Operation(summary = "分页查询租户管理")
    @GetMapping
    public Result<PageResult<TenantDTO>> page(TenantQueryRequest request) {
        return Result.ok(tenantApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询租户管理 详情")
    @GetMapping("/{id}")
    public Result<TenantDTO> detail(@PathVariable Long id) {
        return Result.ok(tenantApplicationService.getDto(id));
    }

    @Operation(summary = "租户管理 统计信息")
    @GetMapping("/statistics")
    public Result<Map<String, Object>> statistics() {
        return Result.ok(tenantApplicationService.statistics());
    }

    @Operation(summary = "创建租户管理")
    @PostMapping
    public Result<TenantDTO> create(@Valid @RequestBody TenantCreateRequest request) {
        return Result.ok(tenantApplicationService.create(request));
    }

    @Operation(summary = "更新租户管理")
    @PutMapping("/{id}")
    public Result<TenantDTO> update(@PathVariable Long id, @Valid @RequestBody TenantCreateRequest request) {
        return Result.ok(tenantApplicationService.update(id, request));
    }

    @Operation(summary = "删除租户管理")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(tenantApplicationService.remove(id));
    }
}
