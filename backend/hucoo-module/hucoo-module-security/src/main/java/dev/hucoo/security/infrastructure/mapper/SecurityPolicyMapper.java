package dev.hucoo.security.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.security.domain.entity.SecurityPolicy;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface SecurityPolicyMapper extends BaseMapper<SecurityPolicy> {
}
