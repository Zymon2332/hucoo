package dev.hucoo.file.domain.enums;

import dev.hucoo.commons.util.StringUtil;

/**
 * 文件状态。
 */
public enum FileStatus {

    /** 正常可下载。 */
    NORMAL,
    /** 已移入回收站，等待延迟物理删除。 */
    RECYCLING,
    /** 已物理删除（对象已从存储中移除）。 */
    PURGED,
    /** 安全检查未通过，禁止下载。 */
    QUARANTINED;

    public static boolean isValid(String value) {
        return of(value) != null;
    }

    public static FileStatus of(String value) {
        if (StringUtil.isBlank(value)) {
            return null;
        }
        for (FileStatus status : values()) {
            if (status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        return null;
    }
}
