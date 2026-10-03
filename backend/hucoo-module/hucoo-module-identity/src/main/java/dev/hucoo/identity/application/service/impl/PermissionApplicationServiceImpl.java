package dev.hucoo.identity.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import java.util.List;
import java.util.Map;

import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.identity.application.converter.PermissionConverter;
import dev.hucoo.identity.application.service.PermissionApplicationService;
import dev.hucoo.identity.api.dto.PermissionMatrixRowDTO;
import dev.hucoo.identity.domain.entity.Role;
import dev.hucoo.identity.domain.entity.Permission;
import dev.hucoo.identity.infrastructure.mapper.PermissionMapper;
import dev.hucoo.identity.infrastructure.mapper.RoleMapper;
import dev.hucoo.identity.config.PermissionCache;
import dev.hucoo.commons.util.IdGenerator;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class PermissionApplicationServiceImpl extends ServiceImpl<PermissionMapper, Permission>
        implements PermissionApplicationService {

    private final PermissionConverter permissionConverter;
    private final RoleMapper roleMapper;
    private final PermissionCache permissionCache;

    public PermissionApplicationServiceImpl(PermissionConverter permissionConverter,
                                            RoleMapper roleMapper,
                                            PermissionCache permissionCache) {
        this.permissionConverter = permissionConverter;
        this.roleMapper = roleMapper;
        this.permissionCache = permissionCache;
    }

    @Override
    public PermissionConverter converter() {
        return permissionConverter;
    }

    @Override
    public List<PermissionMatrixRowDTO> matrix(Long roleId) {
        String tenantId = CurrentTenantContext.getTenantId();
        if (roleId == null) {
            return List.of();
        }
        Role role = roleMapper.selectById(roleId);
        if (role == null) {
            return List.of();
        }
        return getBaseMapper().selectMatrix(roleId, tenantId).stream()
                .map(row -> new PermissionMatrixRowDTO(
                        roleId,
                        ((Number) row.get("permission_id")).longValue(),
                        Boolean.TRUE.equals(row.get("granted"))))
                .toList();
    }

    @Override
    public boolean setRolePermission(Long roleId, Long permissionId, boolean granted) {
        String tenantId = CurrentTenantContext.getTenantId();
        if (roleId == null || permissionId == null
                || roleMapper.selectById(roleId) == null || getById(permissionId) == null) {
            return false;
        }
        boolean changed = granted
                ? getBaseMapper().grantRolePermission(IdGenerator.nextId(), roleId, permissionId, tenantId) > 0
                : getBaseMapper().revokeRolePermission(roleId, permissionId, tenantId) > 0;
        if (changed) {
            permissionCache.invalidateAll();
        }
        return changed;
    }
}
