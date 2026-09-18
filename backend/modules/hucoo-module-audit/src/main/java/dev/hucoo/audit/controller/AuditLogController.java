package dev.hucoo.audit.controller;

import java.util.Map;

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
import dev.hucoo.audit.api.dto.AuditLogCreateRequest;
import dev.hucoo.audit.api.dto.AuditLogDTO;
import dev.hucoo.audit.api.dto.AuditLogQueryRequest;
import dev.hucoo.audit.application.service.AuditLogApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "审计日志")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogApplicationService auditLogApplicationService;

    @Operation(summary = "分页查询审计日志")
    @GetMapping
    public Result<PageResult<AuditLogDTO>> page(AuditLogQueryRequest request) {
        return Result.ok(auditLogApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询审计日志 详情")
    @GetMapping("/{id}")
    public Result<AuditLogDTO> detail(@PathVariable Long id) {
        return Result.ok(auditLogApplicationService.getDto(id));
    }

    @Operation(summary = "审计日志 统计信息")
    @GetMapping("/statistics")
    public Result<Map<String, Object>> statistics() {
        return Result.ok(auditLogApplicationService.statistics());
    }

    @Operation(summary = "创建审计日志")
    @PostMapping
    public Result<AuditLogDTO> create(@Valid @RequestBody AuditLogCreateRequest request) {
        return Result.ok(auditLogApplicationService.create(request));
    }

    @Operation(summary = "更新审计日志")
    @PutMapping("/{id}")
    public Result<AuditLogDTO> update(@PathVariable Long id, @Valid @RequestBody AuditLogCreateRequest request) {
        return Result.ok(auditLogApplicationService.update(id, request));
    }

    @Operation(summary = "删除审计日志")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(auditLogApplicationService.remove(id));
    }
}
