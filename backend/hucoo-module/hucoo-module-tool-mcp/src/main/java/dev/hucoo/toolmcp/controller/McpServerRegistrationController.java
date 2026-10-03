package dev.hucoo.toolmcp.controller;

import java.net.URI;
import java.util.Map;

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
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationCreateRequest;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationQueryRequest;
import dev.hucoo.toolmcp.application.service.McpServerRegistrationApplicationService;
import dev.hucoo.toolmcp.application.service.ToolCatalogFacade;
import dev.hucoo.toolmcp.api.dto.ToolDefinitionCreateRequest;
import dev.hucoo.toolmcp.api.dto.ToolDefinitionDTO;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "MCP 工具")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/mcp-servers")
@RequiredArgsConstructor
public class McpServerRegistrationController {

    private final McpServerRegistrationApplicationService mcpServerRegistrationApplicationService;
    private final ToolCatalogFacade toolCatalog;

    @Operation(summary = "工具目录列表")
    @GetMapping("/tools")
    public Result<PageResult<ToolDefinitionDTO>> tools(McpServerRegistrationQueryRequest request) {
        return Result.ok(toolCatalog.page(request.getKeyword(), request.resolvePageNum(), request.resolvePageSize()));
    }

    @GetMapping("/tools/{id}")
    public Result<ToolDefinitionDTO> tool(@PathVariable Long id) { return Result.ok(toolCatalog.get(id)); }

    @PostMapping("/tools")
    @RequirePermission("tool:create")
    public Result<ToolDefinitionDTO> createTool(@Valid @RequestBody ToolDefinitionCreateRequest request) { return Result.ok(toolCatalog.create(request)); }

    @PutMapping("/tools/{id}")
    @RequirePermission("tool:update")
    public Result<ToolDefinitionDTO> updateTool(@PathVariable Long id, @Valid @RequestBody ToolDefinitionCreateRequest request) { return Result.ok(toolCatalog.update(id, request)); }

    @PatchMapping("/tools/{id}")
    @RequirePermission("tool:update")
    public Result<ToolDefinitionDTO> patchTool(@PathVariable Long id, @Valid @RequestBody ToolDefinitionCreateRequest request) { return Result.ok(toolCatalog.update(id, request)); }

    @DeleteMapping("/tools/{id}")
    @RequirePermission("tool:delete")
    public Result<Boolean> deleteTool(@PathVariable Long id) { return Result.ok(toolCatalog.delete(id)); }

    @Operation(summary = "分页查询MCP 工具")
    @GetMapping
    public Result<PageResult<McpServerRegistrationDTO>> page(McpServerRegistrationQueryRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.pageDtos(request));
    }

    @Operation(summary = "正式 MCP Server 列表")
    @GetMapping("/servers")
    public Result<PageResult<McpServerRegistrationDTO>> servers(McpServerRegistrationQueryRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步检查 MCP Server 健康状态")
    @PostMapping("/servers/{id}/health")
    @RequirePermission("mcp:health-check")
    public Result<AsyncJobDTO> health(@PathVariable Long id) {
        McpServerRegistrationDTO server = mcpServerRegistrationApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("MCP Server 健康检查已提交: " + id, context -> checkHealth(server, context)));
    }

    private void checkHealth(McpServerRegistrationDTO server, AsyncJobContext context) {
        context.checkCancelled();
        context.progress(35, "校验传输协议和 Endpoint");
        boolean endpointValid = false;
        try {
            endpointValid = server.getEndpoint() != null && URI.create(server.getEndpoint()).isAbsolute();
        } catch (IllegalArgumentException ignored) {
            // The result is reported as unhealthy below.
        }
        context.result("transport", server.getTransport());
        context.result("endpointValid", endpointValid);
        context.result("healthy", endpointValid && server.getReviewStatus() != null && server.getReviewStatus() > 0);
        context.progress(100, "MCP Server 健康检查完成");
    }

    @Operation(summary = "查询MCP 工具 详情")
    @GetMapping("/{id}")
    public Result<McpServerRegistrationDTO> detail(@PathVariable Long id) {
        return Result.ok(mcpServerRegistrationApplicationService.getDto(id));
    }

    @Operation(summary = "创建MCP 工具")
    @PostMapping
    @RequirePermission("mcp:create")
    public Result<McpServerRegistrationDTO> create(@Valid @RequestBody McpServerRegistrationCreateRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.create(request));
    }

    @Operation(summary = "更新MCP 工具")
    @PutMapping("/{id}")
    @RequirePermission("mcp:update")
    public Result<McpServerRegistrationDTO> update(@PathVariable Long id, @Valid @RequestBody McpServerRegistrationCreateRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("mcp:update")
    public Result<McpServerRegistrationDTO> patch(@PathVariable Long id, @Valid @RequestBody McpServerRegistrationCreateRequest request) {
        return Result.ok(mcpServerRegistrationApplicationService.update(id, request));
    }

    @Operation(summary = "删除MCP 工具")
    @DeleteMapping("/{id}")
    @RequirePermission("mcp:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(mcpServerRegistrationApplicationService.remove(id));
    }
}
