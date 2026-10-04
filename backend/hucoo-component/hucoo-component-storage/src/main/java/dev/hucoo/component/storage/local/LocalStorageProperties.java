package dev.hucoo.component.storage.local;

import java.nio.file.Path;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * 本地文件系统驱动配置。
 */
@Data
@ConfigurationProperties(prefix = "agent-platform.storage.local")
public class LocalStorageProperties {

    /** 存储根目录，生产必须写绝对路径。 */
    private String root = "./data/files";

    /** 启动时自动创建根目录。 */
    private boolean createDirs = true;

    /** 分片上传临时目录名（相对 root）。 */
    private String tempDir = ".uploads";

    /** 是否在删除对象后清理空目录。 */
    private boolean cleanEmptyDirs = true;

    /** 绝对路径形式的根目录，由驱动解析后回填。 */
    public Path resolveRoot() {
        return Path.of(root).toAbsolutePath().normalize();
    }
}
