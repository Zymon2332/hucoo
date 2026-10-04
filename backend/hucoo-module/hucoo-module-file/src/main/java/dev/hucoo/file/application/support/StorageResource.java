package dev.hucoo.file.application.support;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.core.io.AbstractResource;
import org.springframework.lang.NonNull;

import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageException;

/**
 * 把对象存储中的对象包装成 Spring {@code Resource}，用于流式下载。
 *
 * <p>为什么不直接用 {@code InputStreamResource}：它的 {@code contentLength()} 返回
 * {@code InputStream.available()}，对 S3 的响应流来说是"当前可读字节数"而不是对象总长度，
 * 会让响应头写出错误的 Content-Length，客户端表现为下载被截断。这里显式返回真实长度。
 */
public class StorageResource extends AbstractResource {

    private final StorageClient storageClient;
    private final String bucket;
    private final String objectKey;
    private final long size;
    private final String fileName;

    public StorageResource(StorageClient storageClient, String bucket, String objectKey, long size, String fileName) {
        this.storageClient = storageClient;
        this.bucket = bucket;
        this.objectKey = objectKey;
        this.size = size;
        this.fileName = fileName;
    }

    @Override
    @NonNull
    public InputStream getInputStream() throws IOException {
        try {
            return storageClient.get(bucket, objectKey);
        } catch (StorageException e) {
            throw new IOException(e.getMessage(), e);
        }
    }

    @Override
    public long contentLength() {
        return size;
    }

    @Override
    public String getFilename() {
        return fileName;
    }

    @Override
    public boolean exists() {
        return true;
    }

    /** 单次可读的流式资源，避免框架缓存输入流。 */
    @Override
    public boolean isOpen() {
        return true;
    }

    @Override
    @NonNull
    public String getDescription() {
        return "storage resource [%s/%s]".formatted(bucket, objectKey);
    }
}
