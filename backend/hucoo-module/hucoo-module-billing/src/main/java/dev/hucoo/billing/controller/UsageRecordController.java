package dev.hucoo.billing.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.billing.api.dto.UsageRecordCreateRequest;
import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.api.dto.UsageRecordQueryRequest;
import dev.hucoo.billing.application.service.UsageRecordApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

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

    @Operation(summary = "用量统计列表")
    @GetMapping("/records")
    public Result<PageResult<UsageRecordDTO>> records(UsageRecordQueryRequest request) {
        return Result.ok(usageRecordApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步生成用量报表")
    @PostMapping("/reports")
    @RequirePermission("billing:report")
    public Result<AsyncJobDTO> report() {
        return Result.ok(AsyncJobExecutor.submit("用量报表生成已提交", context -> generateReport(context)));
    }

    @Operation(summary = "异步模拟成本")
    @PostMapping("/costs/simulate")
    @RequirePermission("billing:simulate")
    public Result<AsyncJobDTO> simulateCost(@RequestBody(required = false) Map<String, Object> input) {
        return Result.ok(AsyncJobExecutor.submit("成本模拟已提交", context -> {
            context.checkCancelled();
            context.progress(30, "解析成本模拟参数");
            context.result("input", input == null ? Map.of() : input);
            context.result("platformFee", 0);
            context.result("byokFee", 0);
            context.result("fallbackFee", 0);
            context.progress(100, "成本模拟完成");
        }));
    }

    private void generateReport(AsyncJobContext context) {
        context.checkCancelled();
        context.progress(30, "汇总用量明细");
        PageResult<UsageRecordDTO> records = usageRecordApplicationService.pageDtos(new UsageRecordQueryRequest());
        context.result("recordCount", records.getTotal());
        context.result("reportFormat", "JSON");
        context.progress(75, "计算费用和模型拆分");
        context.checkCancelled();
        context.result("generated", true);
        context.progress(100, "用量报表生成完成");
    }

    @Operation(summary = "查询计费用量 详情")
    @GetMapping("/{id}")
    public Result<UsageRecordDTO> detail(@PathVariable Long id) {
        return Result.ok(usageRecordApplicationService.getDto(id));
    }

    @Operation(summary = "创建计费用量")
    @PostMapping
    @RequirePermission("billing:create")
    public Result<UsageRecordDTO> create(@Valid @RequestBody UsageRecordCreateRequest request) {
        return Result.ok(usageRecordApplicationService.create(request));
    }

    @Operation(summary = "更新计费用量")
    @PutMapping("/{id}")
    @RequirePermission("billing:update")
    public Result<UsageRecordDTO> update(@PathVariable Long id, @Valid @RequestBody UsageRecordCreateRequest request) {
        return Result.ok(usageRecordApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("billing:update")
    public Result<UsageRecordDTO> patch(@PathVariable Long id, @Valid @RequestBody UsageRecordCreateRequest request) {
        return Result.ok(usageRecordApplicationService.update(id, request));
    }

    @Operation(summary = "删除计费用量")
    @DeleteMapping("/{id}")
    @RequirePermission("billing:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(usageRecordApplicationService.remove(id));
    }
}
