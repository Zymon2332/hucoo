package dev.hucoo.identity.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.identity.api.dto.PermissionDTO;
import dev.hucoo.identity.api.dto.PermissionMatrixRowDTO;
import dev.hucoo.identity.api.dto.PermissionQueryRequest;
import dev.hucoo.identity.application.converter.PermissionConverter;
import dev.hucoo.identity.application.service.PermissionApplicationService;
import dev.hucoo.identity.domain.entity.Permission;
import dev.hucoo.identity.infrastructure.mapper.PermissionMapper;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockPermissionApplicationService extends ServiceImpl<PermissionMapper, Permission>
        implements PermissionApplicationService {

    private final Map<Long, Permission> store = new ConcurrentHashMap<>();
    private final Map<Long, Set<Long>> rolePermissions = new ConcurrentHashMap<>();
    private final PermissionConverter permissionConverter;

    public MockPermissionApplicationService(PermissionConverter permissionConverter) {
        this.permissionConverter = permissionConverter;
        seed();
    }

    @Override
    public PermissionConverter converter() {
        return permissionConverter;
    }

    private void seed() {
        saveSeed("tenant:read", "查看租户", "TENANT", "READ");
        saveSeed("tenant:update", "编辑租户", "TENANT", "UPDATE");
        saveSeed("role:manage", "管理角色", "ROLE", "MANAGE");
    }

    private void saveSeed(String code, String name, String resourceType, String action) {
        Permission permission = new Permission();
        permission.setId(IdGenerator.nextId());
        permission.setPermissionCode(code);
        permission.setPermissionName(name);
        permission.setResourceType(resourceType);
        permission.setAction(action);
        permission.setStatus(1);
        permission.setCreatedAt(LocalDateTime.now());
        permission.setUpdatedAt(LocalDateTime.now());
        permission.setDeleted(0);
        store.put(permission.getId(), permission);
    }

    @Override
    public Permission getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(Permission entity) {
        if (entity.getId() == null) {
            entity.setId(IdGenerator.nextId());
        }
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setDeleted(0);
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean updateById(Permission entity) {
        if (entity.getId() == null || !store.containsKey(entity.getId())) {
            return false;
        }
        entity.setUpdatedAt(LocalDateTime.now());
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean removeById(Serializable id) {
        return id != null && store.remove(Long.valueOf(String.valueOf(id))) != null;
    }

    @Override
    public <E extends IPage<Permission>> E page(E page) {
        List<Permission> all = new ArrayList<>(store.values()).stream()
                .sorted(Comparator.comparing(Permission::getId).reversed())
                .toList();
        long current = page.getCurrent();
        long size = page.getSize();
        int from = (int) Math.max(0L, (current - 1) * size);
        int to = (int) Math.min(all.size(), from + size);
        page.setTotal(all.size());
        page.setRecords(from >= all.size() ? List.of() : all.subList(from, to));
        return page;
    }

    @Override
    public PageResult<PermissionDTO> pageDtos(PermissionQueryRequest request) {
        IPage<Permission> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(permissionConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public List<PermissionMatrixRowDTO> matrix(Long roleId) {
        Set<Long> granted = roleId == null ? Set.of() : rolePermissions.getOrDefault(roleId, Set.of());
        return store.values().stream().sorted(Comparator.comparing(Permission::getId))
                .map(permission -> new PermissionMatrixRowDTO(roleId, permission.getId(), granted.contains(permission.getId())))
                .toList();
    }

    @Override
    public boolean setRolePermission(Long roleId, Long permissionId, boolean granted) {
        if (roleId == null || getById(permissionId) == null) {
            return false;
        }
        Set<Long> permissions = rolePermissions.computeIfAbsent(roleId, ignored -> ConcurrentHashMap.newKeySet());
        if (granted) {
            permissions.add(permissionId);
        } else {
            permissions.remove(permissionId);
        }
        return true;
    }
}
