package dev.hucoo.admin.job;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.security.annotation.RequirePermission;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "异步任务")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobRegistry jobRegistry;

    @Operation(summary = "查询异步任务")
    @GetMapping("/{jobId}")
    public Result<AsyncJobDTO> get(@PathVariable String jobId) {
        AsyncJobDTO job = jobRegistry.find(jobId);
        if (job == null) {
            throw new ResourceNotFoundException("AsyncJob", jobId);
        }
        return Result.ok(job);
    }

    @Operation(summary = "取消异步任务")
    @PostMapping("/{jobId}/cancel")
    @RequirePermission("job:cancel")
    public Result<AsyncJobDTO> cancel(@PathVariable String jobId) {
        AsyncJobDTO job = jobRegistry.cancel(jobId);
        if (job == null) {
            throw new ResourceNotFoundException("AsyncJob", jobId);
        }
        return Result.ok(job);
    }

    @Operation(summary = "重试异步任务")
    @PostMapping("/{jobId}/retry")
    @RequirePermission("job:retry")
    public Result<AsyncJobDTO> retry(@PathVariable String jobId) {
        AsyncJobDTO job = jobRegistry.retry(jobId);
        if (job == null) {
            throw new ResourceNotFoundException("AsyncJob", jobId);
        }
        return Result.ok(job);
    }
}
