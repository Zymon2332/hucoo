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

@Tag(name = "字典类型")
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/dictionary-types")
@RequiredArgsConstructor
public class DictionaryTypeController {
    private final DictionaryService dictionaries;

    @Operation(summary = "分页查询字典类型")
    @GetMapping
    @RequirePermission("dictionary:read")
    public Result<PageResult<DictionaryTypeDTO>> page(@Valid CommonQuery query) {
        return Result.ok(dictionaries.types(query));
    }

    @Operation(summary = "查询字典类型详情")
    @GetMapping("/{id}")
    @RequirePermission("dictionary:read")
    public Result<DictionaryTypeDTO> detail(@PathVariable Long id, @RequestParam(defaultValue = "TENANT") CommonScope scope) {
        return Result.ok(dictionaries.type(id, scope));
    }

    @Operation(summary = "创建字典类型")
    @PostMapping
    @RequirePermission("dictionary:create")
    public Result<DictionaryTypeDTO> create(@RequestParam(defaultValue = "TENANT") CommonScope scope, @Valid @RequestBody DictionaryTypeRequest request) {
        return Result.ok(dictionaries.createType(scope, request));
    }

    @Operation(summary = "更新字典类型（含启停）")
    @PutMapping("/{id}")
    @RequirePermission("dictionary:update")
    public Result<DictionaryTypeDTO> update(@PathVariable Long id, @RequestParam(defaultValue = "TENANT") CommonScope scope,
                                            @Valid @RequestBody DictionaryTypeRequest request) {
        return Result.ok(dictionaries.updateType(id, scope, request));
    }

    @Operation(summary = "删除字典类型及本作用域字典项")
    @DeleteMapping("/{id}")
    @RequirePermission("dictionary:delete")
    public Result<Boolean> delete(@PathVariable Long id, @RequestParam(defaultValue = "TENANT") CommonScope scope, @RequestParam Integer version) {
        return Result.ok(dictionaries.deleteType(id, scope, version));
    }
}
