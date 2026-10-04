package dev.hucoo.component.storage;

import java.time.Instant;
import java.util.Map;

/**
 * 对象元信息。
 */
public record StorageObjectMetadata(String bucket,
                                    String key,
                                    long size,
                                    String contentType,
                                    String etag,
                                    Instant lastModified,
                                    Map<String, String> metadata) {

    public StorageObjectMetadata {
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }

    public static StorageObjectMetadata of(String bucket, String key, long size,
                                           String contentType, String etag, Instant lastModified) {
        return new StorageObjectMetadata(bucket, key, size, contentType, etag, lastModified, Map.of());
    }
}
