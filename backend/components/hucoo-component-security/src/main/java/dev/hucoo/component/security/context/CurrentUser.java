package dev.hucoo.component.security.context;

import java.util.Set;

public record CurrentUser(Long userId,
                          String username,
                          String tenantId,
                          Set<String> permissions) {

    public CurrentUser {
        permissions = permissions == null ? Set.of() : Set.copyOf(permissions);
    }

    public boolean hasPermission(String permission) {
        return permissions.contains("*") || permissions.contains(permission);
    }
}
