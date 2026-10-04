package dev.hucoo.file.application.support;

import org.springframework.core.io.Resource;

/**
 * 待下载的文件内容。
 */
public record FileContent(Long fileId,
                          String fileName,
                          String contentType,
                          long size,
                          Resource resource) {
}
