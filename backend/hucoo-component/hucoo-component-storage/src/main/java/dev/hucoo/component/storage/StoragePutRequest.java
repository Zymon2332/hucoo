package dev.hucoo.component.storage;

import java.util.Map;

/**
 * 对象写入请求。
 *
 * @param bucket        桶名
 * @param key           对象 key
 * @param contentType   MIME 类型，可为 null
 * @param contentLength 内容长度（字节），流式写入时必须已知
 * @param metadata      自定义元数据，写为对象 user-metadata
 */
public record StoragePutRequest(String bucket,
                                String key,
                                String contentType,
                                long contentLength,
                                Map<String, String> metadata) {

    public StoragePutRequest {
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }

    public static StoragePutRequest of(String bucket, String key, String contentType, long contentLength) {
        return new StoragePutRequest(bucket, key, contentType, contentLength, Map.of());
    }

    public static StoragePutRequest of(String bucket, String key, String contentType, long contentLength,
                                       Map<String, String> metadata) {
        return new StoragePutRequest(bucket, key, contentType, contentLength, metadata);
    }
}
