package dev.hucoo.identity.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.identity.api.dto.PermissionCreateRequest;
import dev.hucoo.identity.api.dto.PermissionDTO;
import dev.hucoo.identity.api.dto.PermissionMatrixRowDTO;
import dev.hucoo.identity.api.dto.PermissionQueryRequest;
import dev.hucoo.identity.application.service.PermissionApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "权限管理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionApplicationService permissionApplicationService;

    @Operation(summary = "分页查询权限")
    @GetMapping
    public Result<PageResult<PermissionDTO>> page(PermissionQueryRequest request) {
        return Result.ok(permissionApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询权限详情")
    @GetMapping("/{id}")
    public Result<PermissionDTO> detail(@PathVariable Long id) {
        return Result.ok(permissionApplicationService.getDto(id));
    }

    @Operation(summary = "创建权限")
    @PostMapping
    @RequirePermission("permission:create")
    public Result<PermissionDTO> create(@Valid @RequestBody PermissionCreateRequest request) {
        return Result.ok(permissionApplicationService.create(request));
    }

    @Operation(summary = "更新权限")
    @PutMapping("/{id}")
    @RequirePermission("permission:update")
    public Result<PermissionDTO> update(@PathVariable Long id, @Valid @RequestBody PermissionCreateRequest request) {
        return Result.ok(permissionApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("permission:update")
    public Result<PermissionDTO> patch(@PathVariable Long id, @Valid @RequestBody PermissionCreateRequest request) {
        return Result.ok(permissionApplicationService.update(id, request));
    }

    @Operation(summary = "删除权限")
    @DeleteMapping("/{id}")
    @RequirePermission("permission:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(permissionApplicationService.remove(id));
    }

    @Operation(summary = "查询角色权限矩阵")
    @GetMapping("/matrix")
    public Result<List<PermissionMatrixRowDTO>> matrix(@RequestParam(required = false) Long roleId) {
        return Result.ok(permissionApplicationService.matrix(roleId));
    }

    @Operation(summary = "更新角色权限关系")
    @PatchMapping("/roles/{roleId}/permissions/{permissionId}")
    @RequirePermission("permission:assign")
    public Result<Boolean> setRolePermission(@PathVariable Long roleId, @PathVariable Long permissionId,
            @RequestParam boolean granted) {
        return Result.ok(permissionApplicationService.setRolePermission(roleId, permissionId, granted));
    }
}
