package dev.hucoo.component.security.interceptor;

import dev.hucoo.component.security.context.CurrentUser;

/** Resolves effective permissions without coupling the security component to a business module. */
@FunctionalInterface
public interface PermissionResolver {

    boolean hasPermission(CurrentUser user, String permission);

    static PermissionResolver jwtClaimsOnly() {
        return CurrentUser::hasPermission;
    }
}
