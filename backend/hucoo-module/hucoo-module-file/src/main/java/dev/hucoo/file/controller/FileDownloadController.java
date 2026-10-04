package dev.hucoo.file.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.file.application.service.FileDownloadService;
import dev.hucoo.file.application.support.FileContent;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * 文件下载。
 *
 * <p><b>返回类型必须是 {@code Resource}</b>：{@code hucoo-component-web} 的 {@code ResponseWrapper}
 * 会包装所有 {@code dev.hucoo} 包下非 {@code void / String / byte[] / Resource} 的返回值；
 * 若声明为 {@code ResponseEntity<Resource>}，其 {@code getParameterType()} 是 {@code ResponseEntity}，
 * 会被包成 {@code Result} 导致二进制内容损坏。响应头因此通过 {@code HttpServletResponse} 设置。
 */
@Tag(name = "文件下载")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/files")
@RequiredArgsConstructor
public class FileDownloadController {

    private final FileDownloadService fileDownloadService;

    @Operation(summary = "下载文件")
    @GetMapping("/{id}/content")
    @RequirePermission("file:download")
    public Resource content(@PathVariable Long id, HttpServletResponse response) {
        FileContent content = fileDownloadService.openContent(id);
        applyHeaders(response, content);
        return content.resource();
    }

    /**
     * 匿名分享/签名下载入口：token 即凭证，因此不加 {@code @RequirePermission}。
     * 租户归属由 token 签名保证，服务端查询显式忽略租户拦截器。
     */
    @Operation(summary = "分享链接下载（匿名，token 即凭证）")
    @GetMapping("/download/{token}")
    public Resource shared(@PathVariable String token, HttpServletResponse response) {
        FileContent content = fileDownloadService.openByToken(token);
        applyHeaders(response, content);
        return content.resource();
    }

    private static void applyHeaders(HttpServletResponse response, FileContent content) {
        response.setContentType(content.contentType());
        if (content.size() >= 0) {
            response.setContentLengthLong(content.size());
        }
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                .filename(content.fileName(), StandardCharsets.UTF_8)
                .build()
                .toString());
    }
}
