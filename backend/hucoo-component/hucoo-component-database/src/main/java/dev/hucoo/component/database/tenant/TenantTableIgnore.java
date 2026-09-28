package dev.hucoo.component.database.tenant;

import java.util.Set;

public final class TenantTableIgnore {

    private static final Set<String> IGNORED_TABLES = Set.of(
            "ap_tenant",
            "ap_dictionary",
            "ap_system_config",
            "flyway_schema_history");

    private TenantTableIgnore() {
    }

    public static boolean ignore(String tableName) {
        return tableName == null || IGNORED_TABLES.contains(tableName.toLowerCase());
    }
}
