package dev.hucoo.monitoring.controller;

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
import dev.hucoo.monitoring.api.dto.AlertRuleCreateRequest;
import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.api.dto.AlertRuleQueryRequest;
import dev.hucoo.monitoring.application.service.AlertRuleApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.monitoring.application.service.AlertStateFacade;

@Tag(name = "监控告警")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/alert-rules")
@RequiredArgsConstructor
public class AlertRuleController {

    private final AlertRuleApplicationService alertRuleApplicationService;
    private final AlertStateFacade alertStateFacade;

    @Operation(summary = "分页查询监控告警")
    @GetMapping
    public Result<PageResult<AlertRuleDTO>> page(AlertRuleQueryRequest request) {
        return Result.ok(alertRuleApplicationService.pageDtos(request));
    }

    @Operation(summary = "告警规则正式列表")
    @GetMapping({"/rules", "/alerts"})
    public Result<PageResult<AlertRuleDTO>> rules(AlertRuleQueryRequest request) {
        return Result.ok(alertRuleApplicationService.pageDtos(request));
    }

    @Operation(summary = "确认告警")
    @PostMapping("/alerts/{id}/acknowledge")
    @RequirePermission("alert:acknowledge")
    public Result<Map<String, Object>> acknowledge(@PathVariable Long id) {
        return Result.ok(alertStateFacade.transition(id, "acknowledge"));
    }

    @Operation(summary = "恢复告警")
    @PostMapping("/alerts/{id}/resolve")
    @RequirePermission("alert:resolve")
    public Result<Map<String, Object>> resolve(@PathVariable Long id) {
        return Result.ok(alertStateFacade.transition(id, "resolve"));
    }

    @Operation(summary = "静默告警规则")
    @PostMapping("/rules/{id}/silence")
    @RequirePermission("alert:silence")
    public Result<Map<String, Object>> silence(@PathVariable Long id) {
        return Result.ok(Map.of("ruleId", id, "status", "SILENCED"));
    }

    @Operation(summary = "查询监控告警 详情")
    @GetMapping("/{id}")
    public Result<AlertRuleDTO> detail(@PathVariable Long id) {
        return Result.ok(alertRuleApplicationService.getDto(id));
    }

    @Operation(summary = "创建监控告警")
    @PostMapping
    @RequirePermission("alert:create")
    public Result<AlertRuleDTO> create(@Valid @RequestBody AlertRuleCreateRequest request) {
        return Result.ok(alertRuleApplicationService.create(request));
    }

    @Operation(summary = "更新监控告警")
    @PutMapping("/{id}")
    @RequirePermission("alert:update")
    public Result<AlertRuleDTO> update(@PathVariable Long id, @Valid @RequestBody AlertRuleCreateRequest request) {
        return Result.ok(alertRuleApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("alert:update")
    public Result<AlertRuleDTO> patch(@PathVariable Long id, @Valid @RequestBody AlertRuleCreateRequest request) {
        return Result.ok(alertRuleApplicationService.update(id, request));
    }

    @Operation(summary = "删除监控告警")
    @DeleteMapping("/{id}")
    @RequirePermission("alert:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(alertRuleApplicationService.remove(id));
    }
}
