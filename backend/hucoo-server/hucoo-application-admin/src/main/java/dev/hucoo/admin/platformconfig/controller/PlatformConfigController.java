package dev.hucoo.admin.platformconfig.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.admin.platformconfig.application.PlatformConfigFacade;
import lombok.RequiredArgsConstructor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "平台设置")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/settings")
@RequiredArgsConstructor
public class PlatformConfigController {

    private final PlatformConfigFacade config;

    @Operation(summary = "按分组读取平台设置")
    @GetMapping("/{group}")
    public Result<Map<String, Object>> getGroup(@PathVariable String group) {
        return Result.ok(config.getGroup(group));
    }

    @Operation(summary = "查询 License")
    @GetMapping("/license")
    public Result<Map<String, Object>> license() {
        return Result.ok(config.license());
    }

    @Operation(summary = "查询节点信息")
    @GetMapping("/nodes")
    public Result<Map<String, Object>> nodes() {
        return Result.ok(config.nodes());
    }

    @Operation(summary = "异步更新平台设置")
    @PatchMapping("/{group}/{key}")
    @RequirePermission("settings:update")
    public Result<AsyncJobDTO> update(@PathVariable String group,
                                      @PathVariable String key,
                                      @RequestBody Map<String, Object> request) {
        return Result.ok(AsyncJobExecutor.submit("平台设置更新已提交: " + group + "/" + key,
                context -> apply(context, group, key, request, "UPDATED")));
    }

    @Operation(summary = "异步恢复默认设置")
    @PostMapping("/{group}/{key}/restore")
    @RequirePermission("settings:restore")
    public Result<AsyncJobDTO> restore(@PathVariable String group, @PathVariable String key) {
        return Result.ok(AsyncJobExecutor.submit("平台设置恢复默认已提交: " + group + "/" + key,
                context -> apply(context, group, key, Map.of(), "RESTORED")));
    }

    private void apply(AsyncJobContext context, String group, String key,
                       Map<String, Object> request, String status) {
        context.checkCancelled();
        context.progress(50, "写入设置版本和审计记录");
        if ("UPDATED".equals(status)) config.update(group, key, request);
        else config.restore(group, key);
        context.result("group", group);
        context.result("key", key);
        context.result("value", request == null ? Map.of() : request);
        context.result("status", status);
        context.progress(100, "平台设置操作完成");
    }
}
