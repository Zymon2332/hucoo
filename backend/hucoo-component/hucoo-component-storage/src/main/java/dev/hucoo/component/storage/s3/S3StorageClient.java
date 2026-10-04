package dev.hucoo.component.storage.s3;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import dev.hucoo.component.storage.PresignedUrl;
import dev.hucoo.component.storage.StorageCapabilities;
import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageErrorCode;
import dev.hucoo.component.storage.StorageException;
import dev.hucoo.component.storage.StorageListResult;
import dev.hucoo.component.storage.StorageMultipartInit;
import dev.hucoo.component.storage.StorageObjectMetadata;
import dev.hucoo.component.storage.StoragePartRef;
import dev.hucoo.component.storage.StoragePartResult;
import dev.hucoo.component.storage.StoragePutRequest;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.AbortMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompleteMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/**
 * S3 兼容对象存储驱动，适用于 RustFS、MinIO、AWS S3、阿里云 OSS 等。
 *
 * <p>客户端固定 path-style 寻址（RustFS 默认寻址方式），并关闭 aws-chunked 与请求校验和，
 * 这两项是 S3 兼容实现最常见的失败原因。
 */
public class S3StorageClient implements StorageClient {

    private static final Logger log = LoggerFactory.getLogger(S3StorageClient.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3StorageProperties properties;

    public S3StorageClient(S3Client s3Client, S3Presigner s3Presigner, S3StorageProperties properties) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.properties = properties;
    }

    @Override
    public String provider() {
        return "s3";
    }

    @Override
    public StorageCapabilities capabilities() {
        return StorageCapabilities.S3;
    }

    @Override
    public void put(StoragePutRequest request, InputStream content) {
        PutObjectRequest.Builder builder = PutObjectRequest.builder()
                .bucket(request.bucket())
                .key(request.key());
        if (request.contentType() != null) {
            builder.contentType(request.contentType());
        }
        if (!request.metadata().isEmpty()) {
            builder.metadata(request.metadata());
        }
        try {
            s3Client.putObject(builder.build(), RequestBody.fromInputStream(content, request.contentLength()));
        } catch (S3Exception e) {
            throw map(e, "上传对象失败: %s/%s".formatted(request.bucket(), request.key()));
        }
    }

    @Override
    public StorageObjectMetadata stat(String bucket, String key) {
        HeadObjectResponse response = head(bucket, key);
        if (response == null) {
            throw StorageException.notFound(bucket, key);
        }
        return toMetadata(bucket, key, response);
    }

    @Override
    public boolean exists(String bucket, String key) {
        return head(bucket, key) != null;
    }

    @Override
    public InputStream get(String bucket, String key) {
        try {
            ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(
                    GetObjectRequest.builder().bucket(bucket).key(key).build());
            return stream;
        } catch (S3Exception e) {
            throw map(e, "读取对象失败: %s/%s".formatted(bucket, key));
        }
    }

    @Override
    public void get(String bucket, String key, OutputStream target) {
        try (InputStream in = get(bucket, key)) {
            in.transferTo(target);
            target.flush();
        } catch (IOException e) {
            throw StorageException.ioFailed("写出对象失败: %s/%s".formatted(bucket, key), e);
        }
    }

    @Override
    public void delete(String bucket, String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (S3Exception e) {
            throw map(e, "删除对象失败: %s/%s".formatted(bucket, key));
        }
    }

    @Override
    public StorageListResult list(String bucket, String prefix, String continuationToken, int limit) {
        ListObjectsV2Request.Builder builder = ListObjectsV2Request.builder()
                .bucket(bucket)
                .maxKeys(limit <= 0 ? 100 : limit);
        if (prefix != null && !prefix.isBlank()) {
            builder.prefix(prefix);
        }
        if (continuationToken != null && !continuationToken.isBlank()) {
            builder.continuationToken(continuationToken);
        }
        try {
            ListObjectsV2Response response = s3Client.listObjectsV2(builder.build());
            List<StorageListResult.StorageObjectSummary> items = new ArrayList<>();
            response.contents().forEach(object -> items.add(new StorageListResult.StorageObjectSummary(
                    object.key(), object.size() == null ? 0L : object.size(), object.eTag(),
                    object.lastModified())));
            String nextToken = Boolean.TRUE.equals(response.isTruncated()) ? response.nextContinuationToken() : null;
            return new StorageListResult(items, nextToken);
        } catch (S3Exception e) {
            throw map(e, "列举对象失败: " + bucket);
        }
    }

    @Override
    public PresignedUrl presignGet(String bucket, String key, Duration ttl, String downloadFileName) {
        GetObjectRequest.Builder requestBuilder = GetObjectRequest.builder().bucket(bucket).key(key);
        if (downloadFileName != null && !downloadFileName.isBlank()) {
            requestBuilder.responseContentDisposition(contentDisposition(downloadFileName));
        }
        Duration effectiveTtl = ttl == null || ttl.isZero() || ttl.isNegative() ? Duration.ofMinutes(10) : ttl;
        try {
            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(
                    GetObjectPresignRequest.builder()
                            .signatureDuration(effectiveTtl)
                            .getObjectRequest(requestBuilder.build())
                            .build());
            return new PresignedUrl(presigned.url().toString(), "GET",
                    Instant.now().plus(effectiveTtl), Map.of());
        } catch (RuntimeException e) {
            throw StorageException.ioFailed("生成下载预签名地址失败: %s/%s".formatted(bucket, key), e);
        }
    }

    @Override
    public PresignedUrl presignPut(String bucket, String key, Duration ttl, String contentType) {
        PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder().bucket(bucket).key(key);
        Map<String, String> headers = Map.of();
        if (contentType != null && !contentType.isBlank()) {
            requestBuilder.contentType(contentType);
            headers = Map.of("Content-Type", contentType);
        }
        Duration effectiveTtl = ttl == null || ttl.isZero() || ttl.isNegative() ? Duration.ofMinutes(10) : ttl;
        try {
            PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(
                    PutObjectPresignRequest.builder()
                            .signatureDuration(effectiveTtl)
                            .putObjectRequest(requestBuilder.build())
                            .build());
            return new PresignedUrl(presigned.url().toString(), "PUT",
                    Instant.now().plus(effectiveTtl), headers);
        } catch (RuntimeException e) {
            throw StorageException.ioFailed("生成上传预签名地址失败: %s/%s".formatted(bucket, key), e);
        }
    }

    @Override
    public String initMultipart(StorageMultipartInit request) {
        CreateMultipartUploadRequest.Builder builder = CreateMultipartUploadRequest.builder()
                .bucket(request.bucket())
                .key(request.key());
        if (request.contentType() != null) {
            builder.contentType(request.contentType());
        }
        if (!request.metadata().isEmpty()) {
            builder.metadata(request.metadata());
        }
        try {
            return s3Client.createMultipartUpload(builder.build()).uploadId();
        } catch (S3Exception e) {
            throw map(e, "初始化分片上传失败: %s/%s".formatted(request.bucket(), request.key()));
        }
    }

    @Override
    public StoragePartResult uploadPart(String bucket, String key, String uploadId,
                                        int partNumber, InputStream content, long contentLength) {
        try {
            var response = s3Client.uploadPart(UploadPartRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .uploadId(uploadId)
                    .partNumber(partNumber)
                    .contentLength(contentLength)
                    .build(), RequestBody.fromInputStream(content, contentLength));
            return new StoragePartResult(partNumber, response.eTag(), contentLength);
        } catch (S3Exception e) {
            throw map(e, "上传分片失败: %s/%s#%d".formatted(bucket, key, partNumber));
        }
    }

    @Override
    public StorageObjectMetadata completeMultipart(String bucket, String key, String uploadId,
                                                   List<StoragePartRef> parts) {
        List<CompletedPart> completedParts = (parts == null ? List.<StoragePartRef>of() : parts).stream()
                .sorted(java.util.Comparator.comparingInt(StoragePartRef::partNumber))
                .map(part -> CompletedPart.builder().partNumber(part.partNumber()).eTag(part.etag()).build())
                .collect(Collectors.toList());
        try {
            s3Client.completeMultipartUpload(CompleteMultipartUploadRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .uploadId(uploadId)
                    .multipartUpload(CompletedMultipartUpload.builder().parts(completedParts).build())
                    .build());
            return stat(bucket, key);
        } catch (S3Exception e) {
            throw map(e, "合并分片失败: %s/%s".formatted(bucket, key));
        }
    }

    @Override
    public void abortMultipart(String bucket, String key, String uploadId) {
        try {
            s3Client.abortMultipartUpload(AbortMultipartUploadRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .uploadId(uploadId)
                    .build());
        } catch (S3Exception e) {
            log.warn("abort multipart upload failed: bucket={}, key={}, uploadId={}, code={}",
                    bucket, key, uploadId, e.statusCode());
        }
    }

    @Override
    public void ensureBucket(String bucket) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception e) {
            if (e.statusCode() != 404) {
                throw map(e, "检查 bucket 失败: " + bucket);
            }
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                log.info("s3 bucket created: {}", bucket);
            } catch (S3Exception createError) {
                throw map(createError, "创建 bucket 失败: " + bucket);
            }
        }
    }

    // ------------------------------------------------------------------

    private HeadObjectResponse head(String bucket, String key) {
        try {
            return s3Client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return null;
            }
            throw map(e, "读取对象元信息失败: %s/%s".formatted(bucket, key));
        }
    }

    private static StorageObjectMetadata toMetadata(String bucket, String key, HeadObjectResponse response) {
        return new StorageObjectMetadata(bucket, key,
                response.contentLength() == null ? 0L : response.contentLength(),
                response.contentType(),
                response.eTag(),
                response.lastModified(),
                response.metadata() == null ? Map.of() : response.metadata());
    }

    private static String contentDisposition(String fileName) {
        String ascii = fileName.replaceAll("[^\\x20-\\x7e]", "_").replace("\"", "'");
        String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"%s\"; filename*=UTF-8''%s".formatted(ascii, encoded);
    }

    private static StorageException map(S3Exception e, String message) {
        int status = e.statusCode();
        String detail = "%s (status=%d, code=%s)".formatted(message, status, e.awsErrorDetails() == null
                ? "-" : e.awsErrorDetails().errorCode());
        if (status == 404) {
            return new StorageException(StorageErrorCode.STORAGE_OBJECT_NOT_FOUND, detail, e);
        }
        if (status == 403) {
            return new StorageException(StorageErrorCode.STORAGE_ACCESS_DENIED, detail, e);
        }
        if (status == 413) {
            return new StorageException(StorageErrorCode.STORAGE_PAYLOAD_TOO_LARGE, detail, e);
        }
        if (status >= 500 || status == 429) {
            return new StorageException(StorageErrorCode.STORAGE_UNAVAILABLE, detail, e);
        }
        return new StorageException(StorageErrorCode.STORAGE_IO_FAILED, detail, e);
    }

    /** 供健康检查使用：确认服务端可达。 */
    public boolean ping(String bucket) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            return true;
        } catch (RuntimeException e) {
            log.debug("s3 ping failed: bucket={}, endpoint={}", bucket, properties.getEndpoint(), e);
            return false;
        }
    }

    /** 供诊断使用：当前生效的对外地址。 */
    public URI publicEndpoint() {
        return URI.create(properties.resolvePublicEndpoint());
    }
}
