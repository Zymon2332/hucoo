package dev.hucoo.tenant.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.tenant.domain.entity.Organization;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface OrganizationMapper extends BaseMapper<Organization> {
}
