package dev.hucoo.component.storage.s3;

import java.net.URI;

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import dev.hucoo.component.storage.StorageClient;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * S3 兼容对象存储自动配置。
 *
 * <p>三处关键设置缺一不可：
 * <ol>
 *     <li>{@code forcePathStyle(true)} —— RustFS 默认 path-style，不加会返回 301；</li>
 *     <li>校验和降级为 {@code WHEN_REQUIRED} —— 新版 SDK 默认给请求附加 CRC32 校验和，
 *         S3 兼容实现普遍不认；</li>
 *     <li>关闭 aws-chunked 编码 —— 同理。</li>
 * </ol>
 * 预签名器必须单独开 path-style，否则浏览器拿到的直链在 RustFS 上 301/403。
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(S3Client.class)
@ConditionalOnProperty(prefix = "agent-platform.storage.s3", name = "enabled",
        havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(S3StorageProperties.class)
public class S3StorageConfiguration {

    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean
    public S3Client s3Client(S3StorageProperties properties) {
        return S3Client.builder()
                .endpointOverride(URI.create(properties.getEndpoint()))
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
                .forcePathStyle(properties.isPathStyleAccess())
                .httpClientBuilder(ApacheHttpClient.builder()
                        .connectionTimeout(properties.getConnectionTimeout())
                        .socketTimeout(properties.getSocketTimeout())
                        .maxConnections(properties.getMaxConnections()))
                .overrideConfiguration(configuration -> configuration
                        .apiCallTimeout(properties.getApiCallTimeout())
                        .apiCallAttemptTimeout(properties.getApiCallAttemptTimeout()))
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(properties.isPathStyleAccess())
                        // aws-chunked 编码：S3 兼容实现普遍不支持，必须关闭
                        .chunkedEncodingEnabled(properties.isChunkedEncodingEnabled())
                        .build())
                .build();
    }

    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean
    public S3Presigner s3Presigner(S3StorageProperties properties) {
        return S3Presigner.builder()
                // 预签名必须使用对外可达地址：签名与访问的 host/scheme/port 必须完全一致
                .endpointOverride(URI.create(properties.resolvePublicEndpoint()))
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(properties.isPathStyleAccess())
                        .build())
                .build();
    }

    @Bean
    @ConditionalOnMissingBean
    public StorageClient s3StorageClient(S3Client s3Client, S3Presigner s3Presigner, S3StorageProperties properties) {
        return new S3StorageClient(s3Client, s3Presigner, properties);
    }
}
