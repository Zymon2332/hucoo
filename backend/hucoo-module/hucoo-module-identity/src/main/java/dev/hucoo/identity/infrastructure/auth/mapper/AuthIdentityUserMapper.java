package dev.hucoo.identity.infrastructure.auth.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;

@Mapper
public interface AuthIdentityUserMapper extends BaseMapper<AuthIdentityUser> {

    @Select("SELECT * FROM ap_auth_identity_user WHERE username = #{username} AND deleted = 0 LIMIT 1")
    AuthIdentityUser selectByUsername(@Param("username") String username);
}
