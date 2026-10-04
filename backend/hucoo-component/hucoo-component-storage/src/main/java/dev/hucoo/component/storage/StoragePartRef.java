package dev.hucoo.component.storage;

/**
 * 分片引用，合并时按 {@code partNumber} 升序提交。
 */
public record StoragePartRef(int partNumber, String etag) {
}
