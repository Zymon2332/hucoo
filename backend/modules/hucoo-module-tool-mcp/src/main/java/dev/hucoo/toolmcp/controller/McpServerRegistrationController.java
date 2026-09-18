package dev.hucoo.toolmcp.controller;

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
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationCreateRequest;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationQueryRequest;
import dev.hucoo.toolmcp.application.service.McpServerRegistrationApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "MCP 工具")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/mcp-servers")
@RequiredArgsConstructor
public class McpServerRegistrationController {

    private final McpServerRegistrationApplicationService mcpServerRegistrationApplicationService;

    @Operation(summary = "分页查询MCP 工具")
    @GetMapping
    public Result<PageResult<McpServerRegistrationDTO>> page(McpServerRegistrationQueryRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询MCP 工具 详情")
    @GetMapping("/{id}")
    public Result<McpServerRegistrationDTO> detail(@PathVariable Long id) {
        return Result.ok(mcpServerRegistrationApplicationService.getDto(id));
    }

    @Operation(summary = "创建MCP 工具")
    @PostMapping
    public Result<McpServerRegistrationDTO> create(@Valid @RequestBody McpServerRegistrationCreateRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.create(request));
    }

    @Operation(summary = "更新MCP 工具")
    @PutMapping("/{id}")
    public Result<McpServerRegistrationDTO> update(@PathVariable Long id, @Valid @RequestBody McpServerRegistrationCreateRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.update(id, request));
    }

    @Operation(summary = "删除MCP 工具")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(mcpServerRegistrationApplicationService.remove(id));
    }
}
