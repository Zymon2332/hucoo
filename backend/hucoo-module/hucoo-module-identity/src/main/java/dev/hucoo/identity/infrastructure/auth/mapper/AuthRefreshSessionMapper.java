package dev.hucoo.identity.infrastructure.auth.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.identity.domain.auth.entity.AuthRefreshSession;

@Mapper
public interface AuthRefreshSessionMapper extends BaseMapper<AuthRefreshSession> {

    @Select("SELECT * FROM ap_auth_refresh_session WHERE token_hash = #{tokenHash} AND deleted = 0 LIMIT 1")
    AuthRefreshSession selectByTokenHash(@Param("tokenHash") String tokenHash);

    @Select("SELECT * FROM ap_auth_refresh_session WHERE user_id = #{userId} AND deleted = 0 ORDER BY created_at DESC")
    List<AuthRefreshSession> selectByUserId(@Param("userId") Long userId);

    @Update("UPDATE ap_auth_refresh_session SET session_status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = #{id} AND deleted = 0 AND session_status = 'ACTIVE'")
    int revokeIfActive(@Param("id") Long id);

    @Update("UPDATE ap_auth_refresh_session SET session_status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = #{sessionId} AND user_id = #{userId} AND deleted = 0 AND session_status = 'ACTIVE'")
    int revokeByUserAndSession(@Param("userId") Long userId, @Param("sessionId") Long sessionId);

    @Update("UPDATE ap_auth_refresh_session SET session_status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE token_family = #{tokenFamily} AND deleted = 0 AND session_status = 'ACTIVE'")
    int revokeFamily(@Param("tokenFamily") String tokenFamily);

    @Update("UPDATE ap_auth_refresh_session SET session_status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = #{userId} AND deleted = 0 AND session_status = 'ACTIVE'")
    int revokeAllByUserId(@Param("userId") Long userId);
}
