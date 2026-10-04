package dev.hucoo.file.application.service;

import java.io.InputStream;

/**
 * 上传命令。
 *
 * <p>刻意不依赖 {@code MultipartFile}：Web 层负责把 multipart 解析成命令，
 * 应用层只认流与长度，这样 Mock 实现与其它模块调用都不需要引入 Web 类型。
 *
 * @param contentLength 内容长度，必须已知（流式写入的前提）
 */
public record FileUploadCommand(String fileName,
                                String contentType,
                                long contentLength,
                                InputStream content,
                                String bizType,
                                String bizId,
                                String visibility,
                                String displayName,
                                String source) {
}
