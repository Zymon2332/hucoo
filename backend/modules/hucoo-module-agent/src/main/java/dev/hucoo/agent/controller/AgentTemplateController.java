package dev.hucoo.agent.controller;

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
import dev.hucoo.agent.api.dto.AgentTemplateCreateRequest;
import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.api.dto.AgentTemplateQueryRequest;
import dev.hucoo.agent.application.service.AgentTemplateApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

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

    @Operation(summary = "查询Agent 模板 详情")
    @GetMapping("/{id}")
    public Result<AgentTemplateDTO> detail(@PathVariable Long id) {
        return Result.ok(agentTemplateApplicationService.getDto(id));
    }

    @Operation(summary = "创建Agent 模板")
    @PostMapping
    public Result<AgentTemplateDTO> create(@Valid @RequestBody AgentTemplateCreateRequest request) {
        return Result.ok(agentTemplateApplicationService.create(request));
    }

    @Operation(summary = "更新Agent 模板")
    @PutMapping("/{id}")
    public Result<AgentTemplateDTO> update(@PathVariable Long id, @Valid @RequestBody AgentTemplateCreateRequest request) {
        return Result.ok(agentTemplateApplicationService.update(id, request));
    }

    @Operation(summary = "删除Agent 模板")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(agentTemplateApplicationService.remove(id));
    }
}
