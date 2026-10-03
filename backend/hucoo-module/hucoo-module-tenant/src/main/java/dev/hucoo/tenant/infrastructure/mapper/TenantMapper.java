package dev.hucoo.tenant.infrastructure.mapper;

import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import dev.hucoo.tenant.domain.entity.Tenant;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface TenantMapper extends BaseMapper<Tenant> {

    Map<String, Object> selectStatistics();

    @Select("""
            SELECT
              (SELECT COUNT(*) FROM ap_user_account u WHERE u.tenant_id = t.tenant_id AND u.deleted = 0) AS user_count,
              (SELECT COUNT(*) FROM ap_user_account u WHERE u.tenant_id = t.tenant_id AND u.deleted = 0 AND u.status = 1) AS active_user_count,
              (SELECT COUNT(*) FROM ap_organization o WHERE o.tenant_id = t.tenant_id AND o.deleted = 0) AS organization_count
            FROM ap_tenant t
            WHERE t.id = #{id} AND t.deleted = 0
            """)
    Map<String, Object> selectOverviewStats(Long id);
}
