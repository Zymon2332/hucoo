package dev.hucoo.component.database.tenant;

import java.util.Set;

public final class TenantTableIgnore {

    private static final Set<String> IGNORED_TABLES = Set.of(
            "ap_tenant",
            "ap_dictionary",
            "ap_system_config",
            "ap_auth_identity_user",
            "ap_auth_login_identity",
            "ap_auth_password_credential",
            "ap_auth_tenant_membership",
            "ap_auth_refresh_session",
            "ap_auth_verification_challenge",
            "flyway_schema_history");

    private TenantTableIgnore() {
    }

    public static boolean ignore(String tableName) {
        return tableName == null || IGNORED_TABLES.contains(tableName.toLowerCase());
    }
}
