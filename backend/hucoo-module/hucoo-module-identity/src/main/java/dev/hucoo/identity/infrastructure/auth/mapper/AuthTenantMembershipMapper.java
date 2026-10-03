package dev.hucoo.identity.infrastructure.auth.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.identity.domain.auth.entity.AuthTenantMembership;

@Mapper
public interface AuthTenantMembershipMapper extends BaseMapper<AuthTenantMembership> {

    @Select("SELECT * FROM ap_auth_tenant_membership WHERE user_id = #{userId} AND membership_status = 'ACTIVE' AND deleted = 0 ORDER BY default_membership DESC, id")
    List<AuthTenantMembership> selectActiveByUserId(@Param("userId") Long userId);

    @Select("SELECT * FROM ap_auth_tenant_membership WHERE user_id = #{userId} AND tenant_id = #{tenantId} AND deleted = 0 LIMIT 1")
    AuthTenantMembership selectByUserAndTenant(@Param("userId") Long userId, @Param("tenantId") String tenantId);
}
