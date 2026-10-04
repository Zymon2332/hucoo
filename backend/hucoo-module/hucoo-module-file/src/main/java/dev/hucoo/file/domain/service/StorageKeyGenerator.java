package dev.hucoo.file.domain.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.component.storage.config.StorageProperties;

/**
 * 对象 key 生成规则（领域服务）。
 *
 * <pre>
 * {prefix}/{tenantId}/{bizType 或 common}/{yyyy}/{MM}/{dd}/{id 低字节十六进制}/{id}.{ext}
 * files/000000/PROJECT/2026/10/02/9f/4123456789012345678.pdf
 * </pre>
 *
 * <p>key 中不含原始文件名：文件名只存数据库，规避路径穿越、编码、超长与 Windows 保留字问题；
 * 重命名只改 display_name，不移动对象。日期与 id 低字节两级散列，避免本地存储单目录文件数过多；
 * 散列取自雪花 ID 而不是内容摘要，这样上传可以单遍流式完成（不需要为了算 SHA-256 读两遍）。
 */
@Component
public class StorageKeyGenerator {

    private static final DateTimeFormatter DATE_PATH = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    private static final int MAX_EXTENSION_LENGTH = 16;
    private static final String DEFAULT_EXTENSION = "bin";

    private final StorageProperties storageProperties;

    public StorageKeyGenerator(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    public String generate(String tenantId, String bizType, String fileName) {
        long id = IdGenerator.nextId();
        String safeTenant = sanitizeSegment(tenantId, PlatformConstants.SYSTEM_TENANT_ID);
        String safeBizType = sanitizeSegment(bizType, "common").toUpperCase();
        String shard = "%02x".formatted(id & 0xff);
        return "%s/%s/%s/%s/%s/%d.%s".formatted(
                trimSlashes(storageProperties.getKeyPrefix()),
                safeTenant,
                safeBizType,
                LocalDate.now().format(DATE_PATH),
                shard,
                id,
                resolveExtension(fileName));
    }

    /** 提取并归一化扩展名，非法时回落到 bin。 */
    public String resolveExtension(String fileName) {
        if (StringUtil.isBlank(fileName)) {
            return DEFAULT_EXTENSION;
        }
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            return DEFAULT_EXTENSION;
        }
        String extension = fileName.substring(index + 1).toLowerCase();
        if (extension.length() > MAX_EXTENSION_LENGTH || !extension.matches("[a-z0-9]{1,16}")) {
            return DEFAULT_EXTENSION;
        }
        return extension;
    }

    private static String sanitizeSegment(String value, String fallback) {
        if (StringUtil.isBlank(value)) {
            return fallback;
        }
        String sanitized = value.replaceAll("[^A-Za-z0-9_-]", "_");
        return sanitized.isBlank() ? fallback : sanitized.substring(0, Math.min(64, sanitized.length()));
    }

    private static String trimSlashes(String value) {
        if (StringUtil.isBlank(value)) {
            return "files";
        }
        return value.replaceAll("^/+", "").replaceAll("/+$", "");
    }
}
