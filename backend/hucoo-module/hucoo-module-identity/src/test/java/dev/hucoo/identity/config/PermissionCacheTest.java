package dev.hucoo.identity.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import dev.hucoo.component.cache.config.CacheNames;
import dev.hucoo.identity.infrastructure.mapper.PermissionMapper;

class PermissionCacheTest {

    @Test
    void returnsCachedPermissionsWithoutDatabaseQuery() {
        PermissionMapper mapper = mock(PermissionMapper.class);
        Cache cache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        Set<String> cached = Set.of("tenant:update");
        when(cacheManager.getCache(CacheNames.USER)).thenReturn(cache);
        when(cache.get("permissions:tenant-a:42", Set.class)).thenReturn(cached);

        PermissionCache permissionCache = new PermissionCache(mapper, cacheManager);

        assertEquals(cached, permissionCache.permissions(42L, "tenant-a"));
        verify(mapper, never()).selectCodesByUserId(42L, "tenant-a");
    }

    @Test
    void invalidatesPermissionCacheAfterRoleChange() {
        PermissionMapper mapper = mock(PermissionMapper.class);
        Cache cache = mock(Cache.class);
        CacheManager cacheManager = mock(CacheManager.class);
        when(cacheManager.getCache(CacheNames.USER)).thenReturn(cache);

        new PermissionCache(mapper, cacheManager).invalidateAll();

        verify(cache).clear();
    }
}
