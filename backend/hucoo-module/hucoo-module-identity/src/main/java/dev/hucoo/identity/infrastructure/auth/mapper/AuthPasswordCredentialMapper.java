package dev.hucoo.identity.infrastructure.auth.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.identity.domain.auth.entity.AuthPasswordCredential;

@Mapper
public interface AuthPasswordCredentialMapper extends BaseMapper<AuthPasswordCredential> {

    @Select("SELECT * FROM ap_auth_password_credential WHERE user_id = #{userId} AND deleted = 0 LIMIT 1")
    AuthPasswordCredential selectByUserId(@Param("userId") Long userId);
}
