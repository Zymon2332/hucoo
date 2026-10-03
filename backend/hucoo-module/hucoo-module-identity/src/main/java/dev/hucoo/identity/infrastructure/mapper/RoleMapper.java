package dev.hucoo.identity.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.identity.domain.entity.Role;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface RoleMapper extends BaseMapper<Role> {
}
