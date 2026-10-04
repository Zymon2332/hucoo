package dev.hucoo.component.storage;

import java.io.Serial;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.ErrorCode;

/**
 * 对象存储异常。
 *
 * <p>继承 {@link BusinessException} 后，component-web 的 {@code GlobalExceptionHandler}
 * 无需改动即可把错误码映射为统一的 {@code Result} 信封与 HTTP 状态。
 */
public class StorageException extends BusinessException {

    @Serial
    private static final long serialVersionUID = 1L;

    public StorageException(ErrorCode errorCode) {
        super(errorCode);
    }

    public StorageException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public StorageException(ErrorCode errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }

    public static StorageException notFound(String bucket, String key) {
        return new StorageException(StorageErrorCode.STORAGE_OBJECT_NOT_FOUND,
                "对象不存在: %s/%s".formatted(bucket, key));
    }

    public static StorageException ioFailed(String message, Throwable cause) {
        return new StorageException(StorageErrorCode.STORAGE_IO_FAILED, message, cause);
    }

    public static StorageException unsupported(String message) {
        return new StorageException(StorageErrorCode.STORAGE_OPERATION_UNSUPPORTED, message);
    }

    public static StorageException invalidKey(String key) {
        return new StorageException(StorageErrorCode.STORAGE_KEY_INVALID, "对象 key 非法: " + key);
    }
}
