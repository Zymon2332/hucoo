package dev.hucoo.monitoring.controller;

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
import dev.hucoo.monitoring.api.dto.AlertRuleCreateRequest;
import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.api.dto.AlertRuleQueryRequest;
import dev.hucoo.monitoring.application.service.AlertRuleApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "监控告警")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/alert-rules")
@RequiredArgsConstructor
public class AlertRuleController {

    private final AlertRuleApplicationService alertRuleApplicationService;

    @Operation(summary = "分页查询监控告警")
    @GetMapping
    public Result<PageResult<AlertRuleDTO>> page(AlertRuleQueryRequest request) {
        return Result.ok(alertRuleApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询监控告警 详情")
    @GetMapping("/{id}")
    public Result<AlertRuleDTO> detail(@PathVariable Long id) {
        return Result.ok(alertRuleApplicationService.getDto(id));
    }

    @Operation(summary = "创建监控告警")
    @PostMapping
    public Result<AlertRuleDTO> create(@Valid @RequestBody AlertRuleCreateRequest request) {
        return Result.ok(alertRuleApplicationService.create(request));
    }

    @Operation(summary = "更新监控告警")
    @PutMapping("/{id}")
    public Result<AlertRuleDTO> update(@PathVariable Long id, @Valid @RequestBody AlertRuleCreateRequest request) {
        return Result.ok(alertRuleApplicationService.update(id, request));
    }

    @Operation(summary = "删除监控告警")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(alertRuleApplicationService.remove(id));
    }
}
