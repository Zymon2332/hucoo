package dev.hucoo.billing.controller;

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
import dev.hucoo.billing.api.dto.UsageRecordCreateRequest;
import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.api.dto.UsageRecordQueryRequest;
import dev.hucoo.billing.application.service.UsageRecordApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "计费用量")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/billing/usage-records")
@RequiredArgsConstructor
public class UsageRecordController {

    private final UsageRecordApplicationService usageRecordApplicationService;

    @Operation(summary = "分页查询计费用量")
    @GetMapping
    public Result<PageResult<UsageRecordDTO>> page(UsageRecordQueryRequest request) {
        return Result.ok(usageRecordApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询计费用量 详情")
    @GetMapping("/{id}")
    public Result<UsageRecordDTO> detail(@PathVariable Long id) {
        return Result.ok(usageRecordApplicationService.getDto(id));
    }

    @Operation(summary = "创建计费用量")
    @PostMapping
    public Result<UsageRecordDTO> create(@Valid @RequestBody UsageRecordCreateRequest request) {
        return Result.ok(usageRecordApplicationService.create(request));
    }

    @Operation(summary = "更新计费用量")
    @PutMapping("/{id}")
    public Result<UsageRecordDTO> update(@PathVariable Long id, @Valid @RequestBody UsageRecordCreateRequest request) {
        return Result.ok(usageRecordApplicationService.update(id, request));
    }

    @Operation(summary = "删除计费用量")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(usageRecordApplicationService.remove(id));
    }
}
