package dev.hucoo.component.storage.s3;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import dev.hucoo.commons.util.StringUtil;

import lombok.Data;

/**
 * S3 兼容对象存储配置（RustFS / MinIO / AWS S3 / 阿里云 OSS 共用）。
 */
@Data
@ConfigurationProperties(prefix = "agent-platform.storage.s3")
public class S3StorageProperties {

    /** 服务端内部调用地址，例如 http://127.0.0.1:9000。 */
    private String endpoint = "http://127.0.0.1:9000";

    /** 签发给浏览器的对外地址；为空时回退到 {@link #endpoint}。 */
    private String publicEndpoint;

    /** RustFS / MinIO 默认 us-east-1；区域不匹配会导致 301。 */
    private String region = "us-east-1";

    private String accessKey;

    private String secretKey;

    /** RustFS 只支持 path-style，必须为 true。 */
    private boolean pathStyleAccess = true;

    /** 关闭 aws-chunked 编码，S3 兼容实现普遍不支持。 */
    private boolean chunkedEncodingEnabled = false;

    private Duration connectionTimeout = Duration.ofSeconds(3);

    private Duration socketTimeout = Duration.ofSeconds(60);

    private Duration apiCallTimeout = Duration.ofSeconds(120);

    private Duration apiCallAttemptTimeout = Duration.ofSeconds(30);

    private int maxConnections = 64;

    /** 启动时自动建桶。 */
    private boolean autoCreateBucket = true;

    public String resolvePublicEndpoint() {
        return StringUtil.isBlank(publicEndpoint) ? endpoint : publicEndpoint;
    }

    /** 脱敏输出，避免凭证进入日志。 */
    @Override
    public String toString() {
        return "S3StorageProperties(endpoint=%s, publicEndpoint=%s, region=%s, accessKey=%s, secretKey=****, pathStyleAccess=%s)"
                .formatted(endpoint, publicEndpoint, region, accessKey, pathStyleAccess);
    }
}
