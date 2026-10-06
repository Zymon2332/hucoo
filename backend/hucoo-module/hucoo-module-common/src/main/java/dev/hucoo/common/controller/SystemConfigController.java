package dev.hucoo.common.controller;

import org.springframework.web.bind.annotation.*;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.common.api.dto.*;
import dev.hucoo.common.application.service.*;
import dev.hucoo.component.security.annotation.RequirePermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "通用配置")
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/configs")
@RequiredArgsConstructor
public class SystemConfigController {
    private final SystemConfigService configs;

    @Operation(summary = "分页查询配置")
    @GetMapping
    @RequirePermission("config:read")
    public Result<PageResult<SystemConfigDTO>> page(@Valid CommonQuery query) {
        return Result.ok(configs.page(query));
    }

    @Operation(summary = "查询配置详情")
    @GetMapping("/{id}")
    @RequirePermission("config:read")
    public Result<SystemConfigDTO> detail(@PathVariable Long id, @RequestParam(defaultValue = "TENANT") CommonScope scope) {
        return Result.ok(configs.detail(id, scope));
    }

    @Operation(summary = "创建配置")
    @PostMapping
    @RequirePermission("config:create")
    public Result<SystemConfigDTO> create(@RequestParam(defaultValue = "TENANT") CommonScope scope, @Valid @RequestBody SystemConfigRequest request) {
        return Result.ok(configs.create(scope, request));
    }

    @Operation(summary = "更新配置（含启停）")
    @PutMapping("/{id}")
    @RequirePermission("config:update")
    public Result<SystemConfigDTO> update(@PathVariable Long id, @RequestParam(defaultValue = "TENANT") CommonScope scope,
                                          @Valid @RequestBody SystemConfigRequest request) {
        return Result.ok(configs.update(id, scope, request));
    }

    @Operation(summary = "删除配置；删除覆盖后恢复继承")
    @DeleteMapping("/{id}")
    @RequirePermission("config:delete")
    public Result<Boolean> delete(@PathVariable Long id, @RequestParam(defaultValue = "TENANT") CommonScope scope, @RequestParam Integer version) {
        return Result.ok(configs.delete(id, scope, version));
    }

    @Operation(summary = "按键读取生效配置")
    @GetMapping("/effective/{key}")
    @RequirePermission("config:read")
    public Result<SystemConfigDTO> effective(@PathVariable String key) {
        return Result.ok(configs.effective(key));
    }

    @Operation(summary = "按分组读取生效配置；不传分组返回全部")
    @GetMapping("/effective")
    @RequirePermission("config:read")
    public Result<java.util.List<SystemConfigDTO>> effectiveGroup(@RequestParam(required = false) String group) {
        return Result.ok(configs.effectiveGroup(group));
    }
}
