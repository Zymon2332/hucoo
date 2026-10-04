package dev.hucoo.file.controller;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileUploadForm;
import dev.hucoo.file.application.service.FileUploadCommand;
import dev.hucoo.file.application.service.FileUploadService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 文件上传。
 *
 * <p>P0 只提供服务端代理上传（两种驱动行为一致）。分片上传与浏览器直传在 P1/P2 补齐，
 * 前端可先通过 {@code GET /files/storage/capabilities} 判断当前驱动能力。
 */
@Tag(name = "文件上传")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/files/uploads")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @Operation(summary = "上传文件（multipart/form-data，服务端代理）")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequirePermission("file:upload")
    public Result<FileObjectDTO> upload(@RequestPart("file") MultipartFile file,
                                        @ModelAttribute FileUploadForm form) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "上传文件不能为空");
        }
        try {
            FileUploadCommand command = new FileUploadCommand(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    file.getInputStream(),
                    form.getBizType(),
                    form.getBizId(),
                    form.getVisibility(),
                    form.getDisplayName(),
                    null);
            return Result.ok(fileUploadService.upload(command));
        } catch (IOException e) {
            throw new BusinessException(CommonErrorCode.FILE_STORAGE_ERROR, "读取上传文件失败: " + e.getMessage(), e);
        }
    }
}
