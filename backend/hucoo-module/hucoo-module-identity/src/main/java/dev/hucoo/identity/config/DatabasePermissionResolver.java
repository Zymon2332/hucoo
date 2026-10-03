package dev.hucoo.identity.config;

import org.springframework.stereotype.Component;

import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.interceptor.PermissionResolver;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DatabasePermissionResolver implements PermissionResolver {

    private final PermissionCache permissionCache;

    @Override
    public boolean hasPermission(CurrentUser user, String permission) {
        if (user == null || user.userId() == null) {
            return user != null && user.hasPermission(permission);
        }
        var permissions = permissionCache.permissions(user.userId(), user.tenantId());
        return permissions.contains("*") || permissions.contains(permission);
    }
}
