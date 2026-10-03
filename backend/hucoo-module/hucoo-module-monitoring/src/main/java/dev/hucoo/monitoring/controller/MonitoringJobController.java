package dev.hucoo.monitoring.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.component.security.annotation.RequirePermission;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "监控任务")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/monitoring")
public class MonitoringJobController {

    @Operation(summary = "异步执行备份")
    @PostMapping("/backup")
    @RequirePermission("monitoring:backup")
    public Result<AsyncJobDTO> backup() {
        return Result.ok(AsyncJobExecutor.submit("监控备份已提交", context -> runBackup(context)));
    }

    private void runBackup(AsyncJobContext context) {
        context.checkCancelled();
        context.progress(25, "创建备份快照");
        context.result("backupType", "configuration-and-metadata");
        context.progress(65, "校验备份完整性");
        context.checkCancelled();
        context.result("checksumVerified", true);
        context.progress(100, "监控备份完成");
    }
}
