package dev.hucoo.identity.infrastructure.auth.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.identity.domain.auth.entity.AuthLoginIdentity;

@Mapper
public interface AuthLoginIdentityMapper extends BaseMapper<AuthLoginIdentity> {

    @Select("SELECT * FROM ap_auth_login_identity WHERE method = #{method} AND identifier = #{identifier} AND deleted = 0 LIMIT 1")
    AuthLoginIdentity selectByIdentifier(@Param("method") String method, @Param("identifier") String identifier);

    @Select("SELECT * FROM ap_auth_login_identity WHERE method = #{method} AND provider_subject = #{subject} AND deleted = 0 LIMIT 1")
    AuthLoginIdentity selectByProviderSubject(@Param("method") String method, @Param("subject") String subject);

    @Select("SELECT * FROM ap_auth_login_identity WHERE user_id = #{userId} AND deleted = 0 ORDER BY id")
    List<AuthLoginIdentity> selectByUserId(@Param("userId") Long userId);
}
