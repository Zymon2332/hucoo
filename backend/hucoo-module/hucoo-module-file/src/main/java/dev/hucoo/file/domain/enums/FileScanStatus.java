package dev.hucoo.file.domain.enums;

/**
 * 文件安全扫描状态。
 *
 * <p>P0 默认 {@link #SKIPPED}；接入病毒扫描后上传完成置 {@link #PENDING}，
 * 扫描通过才允许下载，未通过置 {@link #QUARANTINED}。
 */
public enum FileScanStatus {

    SKIPPED,
    PENDING,
    CLEAN,
    INFECTED
}
