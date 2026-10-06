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

@Tag(name = "字典项")
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/dictionary-types/{typeId}/items")
@RequiredArgsConstructor
public class DictionaryItemController {
    private final DictionaryService dictionaries;

    @Operation(summary = "分页查询字典项")
    @GetMapping
    @RequirePermission("dictionary:read")
    public Result<PageResult<DictionaryItemDTO>> page(@PathVariable Long typeId, @Valid CommonQuery query) {
        return Result.ok(dictionaries.items(typeId, query));
    }

    @Operation(summary = "查询字典项详情")
    @GetMapping("/{itemId}")
    @RequirePermission("dictionary:read")
    public Result<DictionaryItemDTO> detail(@PathVariable Long typeId, @PathVariable Long itemId,
                                            @RequestParam(defaultValue = "TENANT") CommonScope scope) {
        return Result.ok(dictionaries.item(typeId, itemId, scope));
    }

    @Operation(summary = "创建字典项")
    @PostMapping
    @RequirePermission("dictionary:create")
    public Result<DictionaryItemDTO> create(@PathVariable Long typeId, @RequestParam(defaultValue = "TENANT") CommonScope scope,
                                            @Valid @RequestBody DictionaryItemRequest request) {
        return Result.ok(dictionaries.createItem(typeId, scope, request));
    }

    @Operation(summary = "更新字典项（含启停与排序）")
    @PutMapping("/{itemId}")
    @RequirePermission("dictionary:update")
    public Result<DictionaryItemDTO> update(@PathVariable Long typeId, @PathVariable Long itemId,
                                            @RequestParam(defaultValue = "TENANT") CommonScope scope, @Valid @RequestBody DictionaryItemRequest request) {
        return Result.ok(dictionaries.updateItem(typeId, itemId, scope, request));
    }

    @Operation(summary = "删除字典项；删除覆盖后恢复继承")
    @DeleteMapping("/{itemId}")
    @RequirePermission("dictionary:delete")
    public Result<Boolean> delete(@PathVariable Long typeId, @PathVariable Long itemId,
                                  @RequestParam(defaultValue = "TENANT") CommonScope scope, @RequestParam Integer version) {
        return Result.ok(dictionaries.deleteItem(typeId, itemId, scope, version));
    }
}
