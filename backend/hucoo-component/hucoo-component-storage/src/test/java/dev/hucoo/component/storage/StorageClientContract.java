package dev.hucoo.component.storage;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 对象存储驱动契约测试。
 *
 * <p>所有驱动实现必须满足同一份契约：本地存储不是"降级实现"，只是寻址方式不同。
 * 新增驱动时继承本类即可获得完整覆盖。
 */
public abstract class StorageClientContract {

    protected static final String BUCKET = "contract-bucket";

    protected abstract StorageClient client();

    @BeforeEach
    void setUpBucket() {
        client().ensureBucket(BUCKET);
    }

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    private void put(String key, String content, String contentType) {
        byte[] payload = bytes(content);
        client().put(StoragePutRequest.of(BUCKET, key, contentType, payload.length), new ByteArrayInputStream(payload));
    }

    @Test
    void shouldPutAndStatObject() {
        put("contract/put.txt", "hello-rustfs", "text/plain");

        StorageObjectMetadata metadata = client().stat(BUCKET, "contract/put.txt");
        assertEquals(bytes("hello-rustfs").length, metadata.size());
        assertEquals(BUCKET, metadata.bucket());
        assertEquals("contract/put.txt", metadata.key());
        assertNotNull(metadata.etag());
        assertNotNull(metadata.lastModified());
        assertTrue(client().exists(BUCKET, "contract/put.txt"));
    }

    @Test
    void shouldReadObjectBack() throws Exception {
        put("contract/read.txt", "content-读回", "text/plain");

        try (InputStream in = client().get(BUCKET, "contract/read.txt")) {
            assertEquals("content-读回", new String(in.readAllBytes(), StandardCharsets.UTF_8));
        }

        ByteArrayOutputStream target = new ByteArrayOutputStream();
        client().get(BUCKET, "contract/read.txt", target);
        assertEquals("content-读回", target.toString(StandardCharsets.UTF_8));
    }

    @Test
    void shouldReturnNotFoundForMissingObject() {
        assertFalse(client().exists(BUCKET, "contract/missing.txt"));
        StorageException statError = assertThrows(StorageException.class,
                () -> client().stat(BUCKET, "contract/missing.txt"));
        assertEquals(StorageErrorCode.STORAGE_OBJECT_NOT_FOUND.getCode(), statError.getCode());
        assertThrows(StorageException.class, () -> client().get(BUCKET, "contract/missing.txt"));
    }

    @Test
    void shouldDeleteObject() {
        put("contract/delete.txt", "bye", "text/plain");
        assertTrue(client().exists(BUCKET, "contract/delete.txt"));

        client().delete(BUCKET, "contract/delete.txt");
        assertFalse(client().exists(BUCKET, "contract/delete.txt"));

        // 重复删除不报错
        client().delete(BUCKET, "contract/delete.txt");
    }

    @Test
    void shouldListObjectsByPrefix() {
        put("contract/list/a.txt", "a", "text/plain");
        put("contract/list/b.txt", "b", "text/plain");
        put("contract/other/c.txt", "c", "text/plain");

        StorageListResult result = client().list(BUCKET, "contract/list/", null, 100);
        List<String> keys = result.objects().stream()
                .map(StorageListResult.StorageObjectSummary::key)
                .toList();
        assertTrue(keys.contains("contract/list/a.txt"), () -> "keys=" + keys);
        assertTrue(keys.contains("contract/list/b.txt"), () -> "keys=" + keys);
        assertFalse(keys.contains("contract/other/c.txt"), () -> "keys=" + keys);
    }

    @Test
    void shouldCompleteMultipartUpload() throws Exception {
        String key = "contract/multipart.bin";
        String uploadId = client().initMultipart(StorageMultipartInit.of(BUCKET, key, "application/octet-stream", -1));
        assertNotNull(uploadId);

        StoragePartResult first = client().uploadPart(BUCKET, key, uploadId, 1,
                new ByteArrayInputStream(bytes("part-one-")), bytes("part-one-").length);
        StoragePartResult second = client().uploadPart(BUCKET, key, uploadId, 2,
                new ByteArrayInputStream(bytes("part-two")), bytes("part-two").length);

        StorageObjectMetadata metadata = client().completeMultipart(BUCKET, key, uploadId,
                List.of(new StoragePartRef(first.partNumber(), first.etag()),
                        new StoragePartRef(second.partNumber(), second.etag())));
        assertEquals(bytes("part-one-part-two").length, metadata.size());

        try (InputStream in = client().get(BUCKET, key)) {
            assertEquals("part-one-part-two", new String(in.readAllBytes(), StandardCharsets.UTF_8));
        }
    }

    @Test
    void shouldAbortMultipartUpload() {
        String key = "contract/multipart-abort.bin";
        String uploadId = client().initMultipart(StorageMultipartInit.of(BUCKET, key, null, -1));
        client().uploadPart(BUCKET, key, uploadId, 1, new ByteArrayInputStream(bytes("x")), 1);

        client().abortMultipart(BUCKET, key, uploadId);
        assertFalse(client().exists(BUCKET, key));
    }

    @Test
    void shouldExposeCapabilities() {
        StorageCapabilities capabilities = client().capabilities();
        assertNotNull(capabilities);
        assertNotNull(client().provider());
        // 所有驱动都必须支持分片上传：大文件能力不能因驱动而异
        assertTrue(capabilities.multipart(), "所有驱动都应支持分片上传");
    }

    @Test
    void shouldKeepMetadataIsolatedPerKey() {
        put("contract/meta/a.txt", "aaa", "text/plain");
        put("contract/meta/b.txt", "bbbb", "text/plain");
        assertEquals(3, client().stat(BUCKET, "contract/meta/a.txt").size());
        assertEquals(4, client().stat(BUCKET, "contract/meta/b.txt").size());
    }
}
