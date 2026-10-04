package dev.hucoo.component.storage.memory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

import dev.hucoo.component.storage.PresignedUrl;
import dev.hucoo.component.storage.StorageCapabilities;
import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageException;
import dev.hucoo.component.storage.StorageListResult;
import dev.hucoo.component.storage.StorageMultipartInit;
import dev.hucoo.component.storage.StorageObjectMetadata;
import dev.hucoo.component.storage.StoragePartRef;
import dev.hucoo.component.storage.StoragePartResult;
import dev.hucoo.component.storage.StoragePutRequest;

/**
 * 内存驱动，仅供单元测试与契约测试使用，禁止在生产 profile 启用。
 */
public class InMemoryStorageClient implements StorageClient {

    private final Map<String, Entry> store = new ConcurrentHashMap<>();
    private final Map<String, Map<Integer, byte[]>> multipart = new ConcurrentHashMap<>();
    private final Map<String, String> buckets = new ConcurrentHashMap<>();

    @Override
    public String provider() {
        return "memory";
    }

    @Override
    public StorageCapabilities capabilities() {
        return StorageCapabilities.MEMORY;
    }

    @Override
    public void put(StoragePutRequest request, InputStream content) {
        try {
            byte[] bytes = content.readAllBytes();
            if (request.contentLength() >= 0 && bytes.length != request.contentLength()) {
                throw StorageException.ioFailed("写入字节数与声明长度不一致", null);
            }
            store.put(key(request.bucket(), request.key()),
                    new Entry(bytes, request.contentType(), bytes.length, Instant.now()));
        } catch (IOException e) {
            throw StorageException.ioFailed("写入内存对象失败", e);
        }
    }

    @Override
    public StorageObjectMetadata stat(String bucket, String key) {
        Entry entry = store.get(key(bucket, key));
        if (entry == null) {
            throw StorageException.notFound(bucket, key);
        }
        return new StorageObjectMetadata(bucket, key, entry.size(), entry.contentType(),
                entry.etag(), entry.lastModified(), Map.of());
    }

    @Override
    public boolean exists(String bucket, String key) {
        return store.containsKey(key(bucket, key));
    }

    @Override
    public InputStream get(String bucket, String key) {
        Entry entry = store.get(key(bucket, key));
        if (entry == null) {
            throw StorageException.notFound(bucket, key);
        }
        return new ByteArrayInputStream(entry.content());
    }

    @Override
    public void get(String bucket, String key, OutputStream target) {
        Entry entry = store.get(key(bucket, key));
        if (entry == null) {
            throw StorageException.notFound(bucket, key);
        }
        try {
            target.write(entry.content());
            target.flush();
        } catch (IOException e) {
            throw StorageException.ioFailed("写出内存对象失败", e);
        }
    }

    @Override
    public void delete(String bucket, String key) {
        store.remove(key(bucket, key));
    }

    @Override
    public StorageListResult list(String bucket, String prefix, String continuationToken, int limit) {
        int effectiveLimit = limit <= 0 ? 100 : limit;
        String normalizedPrefix = prefix == null ? "" : prefix;
        List<StorageListResult.StorageObjectSummary> all = new ArrayList<>();
        new TreeMap<>(store).forEach((fullKey, entry) -> {
            String[] parts = fullKey.split("\\|", 2);
            if (!parts[0].equals(bucket) || !parts[1].startsWith(normalizedPrefix)) {
                return;
            }
            all.add(new StorageListResult.StorageObjectSummary(parts[1], entry.size(), entry.etag(),
                    entry.lastModified()));
        });
        all.sort(Comparator.comparing(StorageListResult.StorageObjectSummary::key));
        List<StorageListResult.StorageObjectSummary> items = new ArrayList<>();
        String nextToken = null;
        for (StorageListResult.StorageObjectSummary summary : all) {
            if (continuationToken != null && summary.key().compareTo(continuationToken) <= 0) {
                continue;
            }
            if (items.size() >= effectiveLimit) {
                nextToken = items.get(items.size() - 1).key();
                break;
            }
            items.add(summary);
        }
        return new StorageListResult(items, nextToken);
    }

    @Override
    public PresignedUrl presignGet(String bucket, String key, Duration ttl, String downloadFileName) {
        throw StorageException.unsupported("内存驱动不支持预签名下载");
    }

    @Override
    public PresignedUrl presignPut(String bucket, String key, Duration ttl, String contentType) {
        throw StorageException.unsupported("内存驱动不支持预签名上传");
    }

    @Override
    public String initMultipart(StorageMultipartInit request) {
        String uploadId = java.util.UUID.randomUUID().toString().replace("-", "");
        multipart.put(uploadId, new ConcurrentHashMap<>());
        return uploadId;
    }

    @Override
    public StoragePartResult uploadPart(String bucket, String key, String uploadId,
                                        int partNumber, InputStream content, long contentLength) {
        try {
            byte[] bytes = content.readAllBytes();
            multipart.computeIfAbsent(uploadId, id -> new ConcurrentHashMap<>()).put(partNumber, bytes);
            return new StoragePartResult(partNumber, etag(bytes), bytes.length);
        } catch (IOException e) {
            throw StorageException.ioFailed("写入内存分片失败", e);
        }
    }

    @Override
    public StorageObjectMetadata completeMultipart(String bucket, String key, String uploadId,
                                                   List<StoragePartRef> parts) {
        Map<Integer, byte[]> uploaded = multipart.get(uploadId);
        if (uploaded == null || uploaded.isEmpty()) {
            throw StorageException.unsupported("分片会话不存在: " + uploadId);
        }
        List<Integer> ordered = (parts == null ? List.<StoragePartRef>of() : parts).stream()
                .map(StoragePartRef::partNumber)
                .sorted()
                .toList();
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        for (Integer partNumber : ordered) {
            byte[] bytes = uploaded.get(partNumber);
            if (bytes == null) {
                throw StorageException.unsupported("分片缺失: " + partNumber);
            }
            buffer.writeBytes(bytes);
        }
        byte[] merged = buffer.toByteArray();
        store.put(key(bucket, key), new Entry(merged, null, merged.length, Instant.now()));
        multipart.remove(uploadId);
        return stat(bucket, key);
    }

    @Override
    public void abortMultipart(String bucket, String key, String uploadId) {
        multipart.remove(uploadId);
    }

    @Override
    public void ensureBucket(String bucket) {
        buckets.put(bucket, bucket);
    }

    @Override
    public void deleteBucket(String bucket) {
        buckets.remove(bucket);
        store.keySet().removeIf(fullKey -> fullKey.startsWith(bucket + "|"));
    }

    /** 测试辅助：清空所有数据。 */
    public void clear() {
        store.clear();
        multipart.clear();
        buckets.clear();
    }

    private static String key(String bucket, String key) {
        return bucket + "|" + key;
    }

    private static String etag(byte[] content) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("MD5");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private record Entry(byte[] content, String contentType, long size, Instant lastModified) {

        String etag() {
            return InMemoryStorageClient.etag(content);
        }
    }
}
