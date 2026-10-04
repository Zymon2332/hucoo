package dev.hucoo.file.config;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import lombok.Data;

/**
 * 文件模块配置。
 */
@Data
@ConfigurationProperties(prefix = "agent-platform.modules.file")
public class FileModuleProperties {

    private boolean enabled = true;

    /** 单文件上限，与 component-storage 的 max-file-size 取小值生效。 */
    private DataSize maxFileSize = DataSize.ofMegabytes(200);

    /** 扩展名白名单，为空表示不限制。 */
    private List<String> allowedExtensions = new ArrayList<>(List.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "json",
            "yaml", "yml", "xml", "zip", "tar", "gz", "png", "jpg", "jpeg", "gif", "svg",
            "mp4", "log"));

    /** 扩展名黑名单，优先级高于白名单。 */
    private List<String> blockedExtensions = new ArrayList<>(List.of(
            "exe", "dll", "so", "sh", "bat", "cmd", "jar", "jsp", "php"));

    /** 是否记录下载审计（下载属于读操作，量大时可按需关闭）。 */
    private boolean downloadAuditEnabled = true;

    /** 后端签名下载链接的默认有效期。 */
    private Duration signedUrlTtl = Duration.ofMinutes(10);

    /** 后端签名下载链接的 HMAC 密钥。 */
    private String signedUrlSecret = "hucoo-file-signed-url-local-secret-please-change";

    /**
     * 生成绝对下载地址时使用的外部基地址（例如 https://admin.example.com）。
     * 留空则返回相对路径，由调用方拼接。
     */
    private String signedUrlBase = "";

    public long maxFileSizeBytes() {
        return maxFileSize.toBytes();
    }

    public boolean isExtensionAllowed(String extension) {
        if (extension == null || extension.isBlank()) {
            return false;
        }
        String normalized = extension.toLowerCase();
        if (blockedExtensions != null && blockedExtensions.stream().anyMatch(normalized::equalsIgnoreCase)) {
            return false;
        }
        if (allowedExtensions == null || allowedExtensions.isEmpty()) {
            return true;
        }
        return allowedExtensions.stream().anyMatch(normalized::equalsIgnoreCase);
    }
}
