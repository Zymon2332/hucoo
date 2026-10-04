package dev.hucoo.component.storage;

import java.util.Map;

/**
 * 分片上传初始化参数。
 */
public record StorageMultipartInit(String bucket,
                                   String key,
                                   String contentType,
                                   long contentLength,
                                   Map<String, String> metadata) {

    public StorageMultipartInit {
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }

    public static StorageMultipartInit of(String bucket, String key, String contentType, long contentLength) {
        return new StorageMultipartInit(bucket, key, contentType, contentLength, Map.of());
    }
}
