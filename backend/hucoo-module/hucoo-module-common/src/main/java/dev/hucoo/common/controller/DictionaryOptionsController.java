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

@Tag(name = "字典选项")
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/dictionaries")
@RequiredArgsConstructor
public class DictionaryOptionsController {
    private final DictionaryService dictionaries;

    @Operation(summary = "按编码读取平台与当前租户合并后的可用字典项")
    @GetMapping("/{code}/options")
    @RequirePermission("dictionary:read")
    public Result<java.util.List<DictionaryItemDTO>> options(@PathVariable String code) {
        return Result.ok(dictionaries.options(code));
    }
}
