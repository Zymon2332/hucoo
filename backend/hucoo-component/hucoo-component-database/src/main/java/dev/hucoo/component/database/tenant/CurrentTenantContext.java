package dev.hucoo.component.database.tenant;

import java.util.Optional;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.util.StringUtil;

public final class CurrentTenantContext {

    private static final ThreadLocal<String> HOLDER = new ThreadLocal<>();

    private CurrentTenantContext() {
    }

    public static void set(String tenantId) {
        HOLDER.set(tenantId);
    }

    public static String getTenantId() {
        return Optional.ofNullable(HOLDER.get())
                .filter(StringUtil::isNotBlank)
                .orElse(PlatformConstants.SYSTEM_TENANT_ID);
    }

    public static String getTenantIdOrNull() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
