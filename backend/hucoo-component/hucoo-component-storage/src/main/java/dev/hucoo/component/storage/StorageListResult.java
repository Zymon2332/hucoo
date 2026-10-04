package dev.hucoo.component.storage;

import java.time.Instant;
import java.util.List;

/**
 * 对象列举结果，{@code nextToken} 为空表示没有更多数据。
 */
public record StorageListResult(List<StorageObjectSummary> objects, String nextToken) {

    public StorageListResult {
        objects = objects == null ? List.of() : List.copyOf(objects);
    }

    public static StorageListResult empty() {
        return new StorageListResult(List.of(), null);
    }

    public boolean hasMore() {
        return nextToken != null && !nextToken.isBlank();
    }

    /**
     * 列举结果中的单个对象。
     */
    public record StorageObjectSummary(String key, long size, String etag, Instant lastModified) {
    }
}
