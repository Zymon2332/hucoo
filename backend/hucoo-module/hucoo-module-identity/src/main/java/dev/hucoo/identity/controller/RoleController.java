package dev.hucoo.identity.controller;

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
import dev.hucoo.identity.api.dto.RoleCreateRequest;
import dev.hucoo.identity.api.dto.RoleDTO;
import dev.hucoo.identity.api.dto.RoleQueryRequest;
import dev.hucoo.identity.application.service.RoleApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "角色管理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleApplicationService roleApplicationService;

    @Operation(summary = "分页查询角色")
    @GetMapping
    public Result<PageResult<RoleDTO>> page(RoleQueryRequest request) {
        return Result.ok(roleApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询角色详情")
    @GetMapping("/{id}")
    public Result<RoleDTO> detail(@PathVariable Long id) {
        return Result.ok(roleApplicationService.getDto(id));
    }

    @Operation(summary = "创建角色")
    @PostMapping
    @RequirePermission("role:create")
    public Result<RoleDTO> create(@Valid @RequestBody RoleCreateRequest request) {
        return Result.ok(roleApplicationService.create(request));
    }

    @Operation(summary = "更新角色")
    @PutMapping("/{id}")
    @RequirePermission("role:update")
    public Result<RoleDTO> update(@PathVariable Long id, @Valid @RequestBody RoleCreateRequest request) {
        return Result.ok(roleApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("role:update")
    public Result<RoleDTO> patch(@PathVariable Long id, @Valid @RequestBody RoleCreateRequest request) {
        return Result.ok(roleApplicationService.update(id, request));
    }

    @Operation(summary = "删除角色")
    @DeleteMapping("/{id}")
    @RequirePermission("role:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(roleApplicationService.remove(id));
    }
}
