package dev.hucoo.admin.operations.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import dev.hucoo.admin.operations.application.ExperimentCatalogFacade;

@Tag(name = "实验与发布")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/experiments")
@RequiredArgsConstructor
public class ExperimentController {

    private final ExperimentCatalogFacade catalog;

    @Operation(summary = "实验列表")
    @GetMapping
    public Result<PageResult<Map<String, Object>>> page() {
        return Result.ok(catalog.page());
    }

    @Operation(summary = "异步启动实验")
    @PostMapping("/{id}/start")
    @RequirePermission("experiment:start")
    public Result<AsyncJobDTO> start(@PathVariable Long id) {
        return submit(id, "RUNNING", "实验启动");
    }

    @Operation(summary = "异步停止实验")
    @PostMapping("/{id}/stop")
    @RequirePermission("experiment:stop")
    public Result<AsyncJobDTO> stop(@PathVariable Long id) {
        return submit(id, "STOPPED", "实验停止");
    }

    @Operation(summary = "异步回滚实验")
    @PostMapping("/{id}/rollback")
    @RequirePermission("experiment:rollback")
    public Result<AsyncJobDTO> rollback(@PathVariable Long id) {
        return submit(id, "ROLLED_BACK", "实验回滚");
    }

    private Result<AsyncJobDTO> submit(Long id, String status, String action) {
        return Result.ok(AsyncJobExecutor.submit(action + "已提交: " + id, context -> {
            context.checkCancelled();
            catalog.updateStatus(id, status);
            context.progress(50, "更新 feature flag 和流量策略");
            context.result("experimentId", id);
            context.result("status", status);
            context.progress(100, action + "完成");
        }));
    }
}
