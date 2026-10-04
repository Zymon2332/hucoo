package dev.hucoo.component.storage;

import dev.hucoo.commons.exception.ErrorCode;

/**
 * 基础设施组件错误码，段位 300xxx（业务模块段位见 {@code CommonErrorCode}）。
 */
public enum StorageErrorCode implements ErrorCode {

    STORAGE_OBJECT_NOT_FOUND(300001, "对象不存在", "storage"),
    STORAGE_ACCESS_DENIED(300002, "对象存储拒绝访问", "storage"),
    STORAGE_IO_FAILED(300003, "对象存储读写失败", "storage"),
    STORAGE_UNAVAILABLE(300004, "对象存储不可用", "storage"),
    STORAGE_OPERATION_UNSUPPORTED(300005, "当前存储驱动不支持该操作", "storage"),
    STORAGE_KEY_INVALID(300006, "对象 key 非法", "storage"),
    STORAGE_PAYLOAD_TOO_LARGE(300007, "对象超过存储上限", "storage");

    private final int code;
    private final String message;
    private final String module;

    StorageErrorCode(int code, String message, String module) {
        this.code = code;
        this.message = message;
        this.module = module;
    }

    @Override
    public int getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }

    @Override
    public String getModule() {
        return module;
    }
}
