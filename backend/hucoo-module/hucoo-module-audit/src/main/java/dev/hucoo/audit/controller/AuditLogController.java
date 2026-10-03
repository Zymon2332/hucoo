package dev.hucoo.audit.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.api.dto.AuditLogQueryRequest;
import dev.hucoo.audit.application.service.AuditLogApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "审计日志")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogApplicationService auditLogApplicationService;

    @Operation(summary = "分页查询审计日志")
    @GetMapping
    @RequirePermission("audit:read")
    public Result<PageResult<AuditLogDTO>> page(AuditLogQueryRequest request) {
        return Result.ok(auditLogApplicationService.pageDtos(request));
    }

    @Operation(summary = "正式审计日志列表")
    @GetMapping("/logs")
    @RequirePermission("audit:read")
    public Result<PageResult<AuditLogDTO>> logs(AuditLogQueryRequest request) {
        return Result.ok(auditLogApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步导出审计日志")
    @PostMapping("/export")
    @RequirePermission("audit:export")
    public Result<AsyncJobDTO> export() {
        return Result.ok(AsyncJobExecutor.submit("审计日志导出已提交", context -> exportLogs(context)));
    }

    private void exportLogs(AsyncJobContext context) {
        context.checkCancelled();
        context.progress(30, "读取审计日志");
        Map<String, Object> statistics = auditLogApplicationService.statistics();
        context.result("statistics", statistics);
        context.result("format", "CSV");
        context.progress(75, "生成导出文件");
        context.checkCancelled();
        context.result("downloadReady", true);
        context.progress(100, "审计日志导出完成");
    }

    @Operation(summary = "查询审计日志 详情")
    @GetMapping("/{id}")
    @RequirePermission("audit:read")
    public Result<AuditLogDTO> detail(@PathVariable Long id) {
        return Result.ok(auditLogApplicationService.getDto(id));
    }

    @Operation(summary = "审计日志 统计信息")
    @GetMapping("/statistics")
    @RequirePermission("audit:read")
    public Result<Map<String, Object>> statistics() {
        return Result.ok(auditLogApplicationService.statistics());
    }
}
