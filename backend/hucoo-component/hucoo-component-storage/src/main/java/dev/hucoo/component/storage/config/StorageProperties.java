package dev.hucoo.component.storage.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import lombok.Data;

/**
 * 对象存储通用配置。
 */
@Data
@ConfigurationProperties(prefix = "agent-platform.storage")
public class StorageProperties {

    private boolean enabled = true;

    /** 驱动类型：s3 | local | memory（memory 仅测试）。 */
    private String type = "local";

    /** 默认桶名。 */
    private String defaultBucket = "hucoo-files";

    /** 对象 key 前缀。 */
    private String keyPrefix = "files";

    /** 小于等于该阈值走简单上传，超过走分片上传。 */
    private DataSize simpleUploadThreshold = DataSize.ofMegabytes(8);

    /** 分片大小。 */
    private DataSize partSize = DataSize.ofMegabytes(8);

    /** 单文件上限。 */
    private DataSize maxFileSize = DataSize.ofMegabytes(200);

    /** 预签名有效期。 */
    private Duration presignTtl = Duration.ofMinutes(10);

    /** 上传会话有效期。 */
    private Duration uploadSessionTtl = Duration.ofMinutes(1440);

    /** 启动时自动建桶。 */
    private boolean autoCreateBucket = true;

    /** 健康检查使用的哨兵对象 key。 */
    private String healthCheckKey = ".healthcheck";

    public long simpleUploadThresholdBytes() {
        return simpleUploadThreshold.toBytes();
    }

    public long partSizeBytes() {
        return partSize.toBytes();
    }

    public long maxFileSizeBytes() {
        return maxFileSize.toBytes();
    }
}
