package dev.hucoo.modelgovernance.domain;

import java.time.LocalDateTime;

/** 灰度名单的稳定身份输入；不得从请求头或查询参数覆盖 tenantId/userId。 */
public record ModelCatalogPolicyContext(String tenantId, Long projectId, Long userId,
                                        LocalDateTime requestTime, String modelCode,
                                        String versionCode, String catalogVersion) {
    public int scopePriority(String type, String id) {
        if (type == null) return 0;
        return switch (type) {
            case "USER" -> userId != null && userId.toString().equals(id) ? 4 : 0;
            case "PROJECT" -> projectId != null && projectId.toString().equals(id) ? 3 : 0;
            case "TENANT" -> tenantId.equals(id) ? 2 : 0;
            case "PLATFORM" -> "".equals(id) ? 1 : 0;
            default -> 0;
        };
    }
}
