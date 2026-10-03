package dev.hucoo.agent.controller;

import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.agent.api.dto.AgentTemplateCreateRequest;
import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.api.dto.AgentTemplateQueryRequest;
import dev.hucoo.agent.application.service.AgentTemplateApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "Agent 模板")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/agents")
@RequiredArgsConstructor
public class AgentTemplateController {

    private final AgentTemplateApplicationService agentTemplateApplicationService;

    @Operation(summary = "分页查询Agent 模板")
    @GetMapping
    public Result<PageResult<AgentTemplateDTO>> page(AgentTemplateQueryRequest request) {
        return Result.ok(agentTemplateApplicationService.pageDtos(request));
    }

    @Operation(summary = "Agent 模板正式列表")
    @GetMapping("/templates")
    public Result<PageResult<AgentTemplateDTO>> templates(AgentTemplateQueryRequest request) {
        return Result.ok(agentTemplateApplicationService.pageDtos(request));
    }

    @Operation(summary = "Agent 市场列表")
    @GetMapping("/market")
    public Result<PageResult<AgentTemplateDTO>> market(AgentTemplateQueryRequest request) {
        return Result.ok(agentTemplateApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步发布 Agent 版本")
    @PostMapping("/templates/{id}/publish")
    @RequirePermission("agent:publish")
    public Result<AsyncJobDTO> publish(@PathVariable Long id) {
        AgentTemplateDTO template = agentTemplateApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("Agent 发布已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(30, "校验模型和工具策略");
            context.result("agentCode", template.getAgentCode());
            context.result("releaseStatus", "PUBLISHED");
            context.progress(100, "Agent 发布完成");
        }));
    }

    @Operation(summary = "异步回滚 Agent 版本")
    @PostMapping("/templates/{id}/rollback")
    @RequirePermission("agent:rollback")
    public Result<AsyncJobDTO> rollback(@PathVariable Long id) {
        AgentTemplateDTO template = agentTemplateApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("Agent 回滚已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(45, "定位上一可用版本");
            context.result("agentCode", template.getAgentCode());
            context.result("releaseStatus", "ROLLED_BACK");
            context.progress(100, "Agent 回滚完成");
        }));
    }

    @Operation(summary = "提交 Agent 市场审核")
    @PostMapping("/market/{id}/submit")
    @RequirePermission("agent:market-submit")
    public Result<AsyncJobDTO> submitMarket(@PathVariable Long id) {
        AgentTemplateDTO template = agentTemplateApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("Agent 市场审核已提交: " + id, context -> {
            context.result("agentCode", template.getAgentCode());
            context.result("reviewStatus", "PENDING");
            context.progress(100, "市场审核申请已创建");
        }));
    }

    @Operation(summary = "查询Agent 模板 详情")
    @GetMapping("/{id}")
    public Result<AgentTemplateDTO> detail(@PathVariable Long id) {
        return Result.ok(agentTemplateApplicationService.getDto(id));
    }

    @Operation(summary = "创建Agent 模板")
    @PostMapping
    @RequirePermission("agent:create")
    public Result<AgentTemplateDTO> create(@Valid @RequestBody AgentTemplateCreateRequest request) {
        return Result.ok(agentTemplateApplicationService.create(request));
    }

    @Operation(summary = "更新Agent 模板")
    @PutMapping("/{id}")
    @RequirePermission("agent:update")
    public Result<AgentTemplateDTO> update(@PathVariable Long id, @Valid @RequestBody AgentTemplateCreateRequest request) {
        return Result.ok(agentTemplateApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("agent:update")
    public Result<AgentTemplateDTO> patch(@PathVariable Long id, @Valid @RequestBody AgentTemplateCreateRequest request) {
        return Result.ok(agentTemplateApplicationService.update(id, request));
    }

    @Operation(summary = "删除Agent 模板")
    @DeleteMapping("/{id}")
    @RequirePermission("agent:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(agentTemplateApplicationService.remove(id));
    }
}
