package dev.hucoo.file.domain.enums;

import dev.hucoo.commons.util.StringUtil;

/**
 * 文件可见性。
 */
public enum FileVisibility {

    /** 仅上传者与有权限的管理员可见。 */
    PRIVATE,
    /** 同租户内可见。 */
    TENANT,
    /** 匿名签名链接可直接访问。 */
    PUBLIC;

    public static FileVisibility of(String value) {
        if (StringUtil.isBlank(value)) {
            return null;
        }
        for (FileVisibility visibility : values()) {
            if (visibility.name().equalsIgnoreCase(value)) {
                return visibility;
            }
        }
        return null;
    }
}
