package dev.hucoo.identity.infrastructure.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import dev.hucoo.identity.domain.entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;

import java.util.Set;

@Mapper
public interface PermissionMapper extends BaseMapper<Permission> {

    @Select("""
            SELECT DISTINCT p.permission_code
            FROM ap_user_role ur
            JOIN ap_role_permission rp ON rp.role_id = ur.role_id
                AND rp.tenant_id = ur.tenant_id AND rp.deleted = 0
            JOIN ap_permission p ON p.id = rp.permission_id
                AND p.tenant_id = rp.tenant_id AND p.deleted = 0 AND p.status = 1
            WHERE ur.user_id = #{userId}
              AND ur.tenant_id = #{tenantId}
              AND ur.deleted = 0
            """)
    Set<String> selectCodesByUserId(@Param("userId") Long userId, @Param("tenantId") String tenantId);

    @Select("""
            SELECT p.id AS permission_id, #{roleId} AS role_id,
                   CASE WHEN rp.permission_id IS NULL THEN false ELSE true END AS granted
            FROM ap_permission p
            LEFT JOIN ap_role_permission rp ON rp.permission_id = p.id
                AND rp.role_id = #{roleId} AND rp.tenant_id = #{tenantId} AND rp.deleted = 0
            WHERE p.tenant_id = #{tenantId} AND p.deleted = 0
            ORDER BY p.id
            """)
    java.util.List<java.util.Map<String, Object>> selectMatrix(@Param("roleId") Long roleId,
                                                                  @Param("tenantId") String tenantId);

    @Insert("""
            INSERT INTO ap_role_permission (id, role_id, permission_id, tenant_id, version, deleted)
            VALUES (#{id}, #{roleId}, #{permissionId}, #{tenantId}, 0, 0)
            ON CONFLICT (tenant_id, role_id, permission_id) DO UPDATE SET deleted = 0
            """)
    int grantRolePermission(@Param("id") Long id, @Param("roleId") Long roleId,
                            @Param("permissionId") Long permissionId, @Param("tenantId") String tenantId);

    @Delete("DELETE FROM ap_role_permission WHERE role_id = #{roleId} AND permission_id = #{permissionId} AND tenant_id = #{tenantId}")
    int revokeRolePermission(@Param("roleId") Long roleId, @Param("permissionId") Long permissionId,
                             @Param("tenantId") String tenantId);
}
