package dev.hucoo.file.domain.enums;

/**
 * 文件来源。
 */
public enum FileSource {

    /** 管理端上传。 */
    UPLOAD,
    /** 外部导入。 */
    IMPORT,
    /** 系统生成（导出、归档等）。 */
    GENERATED
}
