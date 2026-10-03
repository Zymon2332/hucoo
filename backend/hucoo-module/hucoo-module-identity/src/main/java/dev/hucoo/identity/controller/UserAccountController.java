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
import dev.hucoo.identity.api.dto.UserAccountCreateRequest;
import dev.hucoo.identity.api.dto.UserAccountDTO;
import dev.hucoo.identity.api.dto.UserAccountOverviewDTO;
import dev.hucoo.identity.api.dto.UserAccountQueryRequest;
import dev.hucoo.identity.application.service.UserAccountApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "用户身份")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/users")
@RequiredArgsConstructor
public class UserAccountController {

    private final UserAccountApplicationService userAccountApplicationService;

    @Operation(summary = "分页查询用户身份")
    @GetMapping
    public Result<PageResult<UserAccountDTO>> page(UserAccountQueryRequest request) {
        return Result.ok(userAccountApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询用户身份 详情")
    @GetMapping("/{id}")
    public Result<UserAccountDTO> detail(@PathVariable Long id) {
        return Result.ok(userAccountApplicationService.getDto(id));
    }

    @Operation(summary = "查询用户概览")
    @GetMapping("/{id}/overview")
    public Result<UserAccountOverviewDTO> overview(@PathVariable Long id) {
        return Result.ok(userAccountApplicationService.overview(id));
    }

    @Operation(summary = "创建用户身份")
    @PostMapping
    @RequirePermission("user:create")
    public Result<UserAccountDTO> create(@Valid @RequestBody UserAccountCreateRequest request) {
        return Result.ok(userAccountApplicationService.create(request));
    }

    @Operation(summary = "更新用户身份")
    @PutMapping("/{id}")
    @RequirePermission("user:update")
    public Result<UserAccountDTO> update(@PathVariable Long id, @Valid @RequestBody UserAccountCreateRequest request) {
        return Result.ok(userAccountApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("user:update")
    public Result<UserAccountDTO> patch(@PathVariable Long id,
            @Valid @RequestBody UserAccountCreateRequest request) {
        return Result.ok(userAccountApplicationService.update(id, request));
    }

    @Operation(summary = "删除用户身份")
    @DeleteMapping("/{id}")
    @RequirePermission("user:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(userAccountApplicationService.remove(id));
    }
}
