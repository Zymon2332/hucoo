package dev.hucoo.file.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.api.dto.FileObjectUpdateRequest;
import dev.hucoo.file.api.dto.FileUrlDTO;
import dev.hucoo.file.application.service.FileDownloadService;
import dev.hucoo.file.application.service.FileObjectApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "文件管理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/files")
@RequiredArgsConstructor
public class FileObjectController {

    private final FileObjectApplicationService fileObjectApplicationService;
    private final FileDownloadService fileDownloadService;
    private final ObjectProvider<StorageClient> storageClientProvider;

    @Operation(summary = "分页查询文件")
    @GetMapping
    @RequirePermission("file:read")
    public Result<PageResult<FileObjectDTO>> page(FileObjectQueryRequest request) {
        return Result.ok(fileObjectApplicationService.pageDtos(request));
    }

    @Operation(summary = "当前存储驱动能力（前端据此决定是否展示直传）")
    @GetMapping("/storage/capabilities")
    @RequirePermission("file:read")
    public Result<Map<String, Object>> capabilities() {
        StorageClient storageClient = storageClientProvider.getIfAvailable();
        Map<String, Object> payload = new LinkedHashMap<>();
        if (storageClient == null) {
            payload.put("enabled", false);
            payload.put("provider", "none");
            return Result.ok(payload);
        }
        payload.put("enabled", true);
        payload.put("provider", storageClient.provider());
        payload.put("presignedGet", storageClient.capabilities().presignedGet());
        payload.put("presignedPut", storageClient.capabilities().presignedPut());
        payload.put("multipart", storageClient.capabilities().multipart());
        payload.put("listing", storageClient.capabilities().listing());
        return Result.ok(payload);
    }

    @Operation(summary = "查询文件详情")
    @GetMapping("/{id}")
    @RequirePermission("file:read")
    public Result<FileObjectDTO> detail(@PathVariable Long id) {
        return Result.ok(fileObjectApplicationService.getDto(id));
    }

    @Operation(summary = "获取下载地址（S3 为预签名直链，本地为后端签名代理地址）")
    @GetMapping("/{id}/url")
    @RequirePermission("file:download")
    public Result<FileUrlDTO> url(@PathVariable Long id,
                                  @RequestParam(required = false) Long ttlSeconds) {
        java.time.Duration ttl = ttlSeconds == null ? null : java.time.Duration.ofSeconds(ttlSeconds);
        return Result.ok(fileDownloadService.createUrl(id, ttl));
    }

    @Operation(summary = "更新文件属性（重命名 / 可见性 / 业务绑定）")
    @PatchMapping("/{id}")
    @RequirePermission("file:update")
    public Result<FileObjectDTO> update(@PathVariable Long id,
                                        @Valid @RequestBody FileObjectUpdateRequest request) {
        return Result.ok(fileObjectApplicationService.update(id, request));
    }

    @Operation(summary = "移入回收站")
    @DeleteMapping("/{id}")
    @RequirePermission("file:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(fileObjectApplicationService.remove(id));
    }

    @Operation(summary = "回收站还原")
    @PostMapping("/{id}/restore")
    @RequirePermission("file:update")
    public Result<FileObjectDTO> restore(@PathVariable Long id) {
        return Result.ok(fileObjectApplicationService.restore(id));
    }
}
