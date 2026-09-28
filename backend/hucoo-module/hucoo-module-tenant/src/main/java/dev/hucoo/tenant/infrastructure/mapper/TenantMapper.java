package dev.hucoo.tenant.infrastructure.mapper;

import java.util.Map;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.tenant.domain.entity.Tenant;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface TenantMapper extends BaseMapper<Tenant> {

    Map<String, Object> selectStatistics();
}
