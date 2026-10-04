package dev.hucoo.component.storage;

/**
 * 单个分片的上传结果。
 */
public record StoragePartResult(int partNumber, String etag, long size) {
}
