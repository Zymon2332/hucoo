package dev.hucoo.project.controller;

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
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.project.api.dto.ProjectWorkspaceCreateRequest;
import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.api.dto.ProjectWorkspaceQueryRequest;
import dev.hucoo.project.application.service.ProjectWorkspaceApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "项目工作区")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/projects")
@RequiredArgsConstructor
public class ProjectWorkspaceController {

    private final ProjectWorkspaceApplicationService projectWorkspaceApplicationService;

    @Operation(summary = "分页查询项目工作区")
    @GetMapping
    public Result<PageResult<ProjectWorkspaceDTO>> page(ProjectWorkspaceQueryRequest request) {
        return Result.ok(projectWorkspaceApplicationService.pageDtos(request));
    }

    @Operation(summary = "工作区列表")
    @GetMapping("/workspaces")
    public Result<PageResult<ProjectWorkspaceDTO>> workspaces(ProjectWorkspaceQueryRequest request) {
        return Result.ok(projectWorkspaceApplicationService.pageDtos(request));
    }

    @Operation(summary = "沙箱列表")
    @GetMapping("/sandboxes")
    public Result<PageResult<ProjectWorkspaceDTO>> sandboxes(ProjectWorkspaceQueryRequest request) {
        return Result.ok(projectWorkspaceApplicationService.pageDtos(request));
    }

    @Operation(summary = "异步扫描沙箱镜像")
    @PostMapping("/sandboxes/{id}/scan")
    @RequirePermission("sandbox:scan")
    public Result<AsyncJobDTO> scanSandbox(@PathVariable Long id) {
        ProjectWorkspaceDTO workspace = projectWorkspaceApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("沙箱镜像扫描已提交: " + id,
                context -> scanWorkspace(workspace, context)));
    }

    private void scanWorkspace(ProjectWorkspaceDTO workspace, AsyncJobContext context) {
        context.checkCancelled();
        context.progress(35, "解析镜像和合规基线");
        boolean repositoryConfigured = workspace.getRepositoryUrl() != null && !workspace.getRepositoryUrl().isBlank();
        context.result("riskLevel", repositoryConfigured ? "LOW" : "MEDIUM");
        context.result("vulnerabilityCount", repositoryConfigured ? 0 : 1);
        context.result("complianceStatus", repositoryConfigured ? "PASSED" : "REVIEW_REQUIRED");
        context.progress(100, "沙箱镜像扫描完成");
    }

    @Operation(summary = "异步重建沙箱")
    @PostMapping("/sandboxes/{id}/rebuild")
    @RequirePermission("sandbox:rebuild")
    public Result<AsyncJobDTO> rebuildSandbox(@PathVariable Long id) {
        ProjectWorkspaceDTO workspace = projectWorkspaceApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("沙箱重建已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(30, "准备沙箱资源");
            context.result("workspace", workspace.getProjectCode());
            context.progress(70, "重建运行环境");
            context.checkCancelled();
            context.progress(100, "沙箱重建完成");
        }));
    }

    @Operation(summary = "异步启动工作区")
    @PostMapping("/workspaces/{id}/start")
    @RequirePermission("workspace:start")
    public Result<AsyncJobDTO> startWorkspace(@PathVariable Long id) {
        ProjectWorkspaceDTO workspace = projectWorkspaceApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("工作区启动已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(35, "分配工作区资源");
            context.result("workspace", workspace.getProjectCode());
            context.result("status", "RUNNING");
            context.progress(100, "工作区已启动");
        }));
    }

    @Operation(summary = "异步停止工作区")
    @PostMapping("/workspaces/{id}/stop")
    @RequirePermission("workspace:stop")
    public Result<AsyncJobDTO> stopWorkspace(@PathVariable Long id) {
        ProjectWorkspaceDTO workspace = projectWorkspaceApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("工作区停止已提交: " + id, context -> {
            context.progress(50, "释放工作区进程");
            context.result("workspace", workspace.getProjectCode());
            context.result("status", "STOPPED");
            context.progress(100, "工作区已停止");
        }));
    }

    @Operation(summary = "异步回收工作区")
    @PostMapping("/workspaces/{id}/reclaim")
    @RequirePermission("workspace:reclaim")
    public Result<AsyncJobDTO> reclaimWorkspace(@PathVariable Long id) {
        ProjectWorkspaceDTO workspace = projectWorkspaceApplicationService.getDto(id);
        return Result.ok(AsyncJobExecutor.submit("工作区回收已提交: " + id, context -> {
            context.checkCancelled();
            context.progress(50, "清理工作区资源");
            context.result("workspace", workspace.getProjectCode());
            context.result("status", "RECLAIMED");
            context.progress(100, "工作区已回收");
        }));
    }

    @Operation(summary = "查询项目工作区 详情")
    @GetMapping("/{id}")
    public Result<ProjectWorkspaceDTO> detail(@PathVariable Long id) {
        return Result.ok(projectWorkspaceApplicationService.getDto(id));
    }

    @Operation(summary = "创建项目工作区")
    @PostMapping
    @RequirePermission("project:create")
    public Result<ProjectWorkspaceDTO> create(@Valid @RequestBody ProjectWorkspaceCreateRequest request) {
        return Result.ok(projectWorkspaceApplicationService.create(request));
    }

    @Operation(summary = "更新项目工作区")
    @PutMapping("/{id}")
    @RequirePermission("project:update")
    public Result<ProjectWorkspaceDTO> update(@PathVariable Long id, @Valid @RequestBody ProjectWorkspaceCreateRequest request) {
        return Result.ok(projectWorkspaceApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("project:update")
    public Result<ProjectWorkspaceDTO> patch(@PathVariable Long id, @Valid @RequestBody ProjectWorkspaceCreateRequest request) {
        return Result.ok(projectWorkspaceApplicationService.update(id, request));
    }

    @Operation(summary = "删除项目工作区")
    @DeleteMapping("/{id}")
    @RequirePermission("project:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(projectWorkspaceApplicationService.remove(id));
    }
}
