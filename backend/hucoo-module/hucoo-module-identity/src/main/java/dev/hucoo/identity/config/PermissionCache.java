package dev.hucoo.identity.config;

import java.util.Set;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import dev.hucoo.component.cache.config.CacheNames;
import dev.hucoo.identity.infrastructure.mapper.PermissionMapper;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PermissionCache {

    private final PermissionMapper permissionMapper;
    private final CacheManager cacheManager;

    public Set<String> permissions(Long userId, String tenantId) {
        Cache cache = cacheManager.getCache(CacheNames.USER);
        String key = key(userId, tenantId);
        if (cache != null) {
            Set<String> cached = cache.get(key, Set.class);
            if (cached != null) {
                return cached;
            }
        }
        Set<String> permissions = permissionMapper.selectCodesByUserId(userId, tenantId);
        if (cache != null) {
            cache.put(key, permissions);
        }
        return permissions;
    }

    public void invalidateAll() {
        Cache cache = cacheManager.getCache(CacheNames.USER);
        if (cache != null) {
            cache.clear();
        }
    }

    private String key(Long userId, String tenantId) {
        return "permissions:" + tenantId + ":" + userId;
    }
}
