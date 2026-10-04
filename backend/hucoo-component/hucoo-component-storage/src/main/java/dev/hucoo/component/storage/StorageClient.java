package dev.hucoo.component.storage;

import java.io.InputStream;
import java.io.OutputStream;
import java.time.Duration;
import java.util.List;

/**
 * 对象存储驱动 SPI。
 *
 * <p>驱动差异（S3 兼容服务端 / 本地文件系统 / 内存）全部收敛在该接口后面，业务模块只依赖它。
 * 约定：
 * <ul>
 *     <li>所有操作失败抛 {@link StorageException}，由 component-web 统一映射 HTTP 状态；</li>
 *     <li>不接受 {@code byte[]}，读写一律流式；</li>
 *     <li>对象 key 由调用方给出，组件不做命名策略；</li>
 *     <li>{@link #get(String, String)} 返回的流由调用方负责关闭。</li>
 * </ul>
 */
public interface StorageClient {

    /** 驱动标识：s3 / local / memory。 */
    String provider();

    /** 能力矩阵，供上层决定 UI 与降级策略。 */
    StorageCapabilities capabilities();

    /** 写入对象，长度以 {@link StoragePutRequest#contentLength()} 为准。 */
    void put(StoragePutRequest request, InputStream content);

    /** 读取对象元信息，对象不存在时抛 {@link StorageErrorCode#STORAGE_OBJECT_NOT_FOUND}。 */
    StorageObjectMetadata stat(String bucket, String key);

    /** 判断对象是否存在。 */
    boolean exists(String bucket, String key);

    /** 读取对象内容，调用方负责关闭返回的流。 */
    InputStream get(String bucket, String key);

    /** 把对象内容流式写入调用方提供的输出流（下载代理用，避免中间缓冲）。 */
    void get(String bucket, String key, OutputStream target);

    /** 删除对象，对象不存在时不报错。 */
    void delete(String bucket, String key);

    /** 列举对象，{@code continuationToken} 为上一页返回的游标，无更多数据时为 null。 */
    StorageListResult list(String bucket, String prefix, String continuationToken, int limit);

    /**
     * 生成下载预签名地址。
     *
     * @throws StorageException 当前驱动不支持预签名时抛
     *                          {@link StorageErrorCode#STORAGE_OPERATION_UNSUPPORTED}
     */
    PresignedUrl presignGet(String bucket, String key, Duration ttl, String downloadFileName);

    /**
     * 生成上传预签名地址。
     *
     * @throws StorageException 当前驱动不支持预签名时抛
     *                          {@link StorageErrorCode#STORAGE_OPERATION_UNSUPPORTED}
     */
    PresignedUrl presignPut(String bucket, String key, Duration ttl, String contentType);

    // ------------------------------------------------------------------
    // 分片上传：本地驱动用临时分片目录实现，语义与 S3 保持一致
    // ------------------------------------------------------------------

    /** 初始化分片上传，返回存储侧的上传标识。 */
    String initMultipart(StorageMultipartInit request);

    /** 上传单个分片。 */
    StoragePartResult uploadPart(String bucket, String key, String uploadId,
                                 int partNumber, InputStream content, long contentLength);

    /** 合并分片，返回最终对象元信息。 */
    StorageObjectMetadata completeMultipart(String bucket, String key, String uploadId, List<StoragePartRef> parts);

    /** 取消分片上传并释放已写入的分片。 */
    void abortMultipart(String bucket, String key, String uploadId);

    /** 确保 bucket 存在，已存在时直接返回。 */
    default void ensureBucket(String bucket) {
        // 默认空实现：本地与内存驱动无需建桶
    }

    /** 删除整个 bucket（仅维护任务使用）。 */
    default void deleteBucket(String bucket) {
        throw new StorageException(StorageErrorCode.STORAGE_OPERATION_UNSUPPORTED,
                "当前驱动不支持删除 bucket: " + provider());
    }
}
