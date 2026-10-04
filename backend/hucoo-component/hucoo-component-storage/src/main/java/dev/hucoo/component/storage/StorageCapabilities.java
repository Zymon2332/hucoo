package dev.hucoo.component.storage;

/**
 * 驱动能力矩阵。上层据此决定 UI（是否展示直传）与降级策略（本地驱动没有预签名，改用后端签名代理）。
 */
public record StorageCapabilities(boolean presignedGet,
                                  boolean presignedPut,
                                  boolean multipart,
                                  boolean listing,
                                  boolean versioning) {

    public static final StorageCapabilities S3 =
            new StorageCapabilities(true, true, true, true, false);

    public static final StorageCapabilities LOCAL =
            new StorageCapabilities(false, false, true, true, false);

    public static final StorageCapabilities MEMORY =
            new StorageCapabilities(false, false, true, true, false);

    /** 是否支持浏览器直传（需要预签名 PUT）。 */
    public boolean supportsDirectUpload() {
        return presignedPut;
    }
}
