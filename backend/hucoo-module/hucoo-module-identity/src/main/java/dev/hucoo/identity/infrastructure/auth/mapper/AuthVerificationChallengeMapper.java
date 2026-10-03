package dev.hucoo.identity.infrastructure.auth.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.identity.domain.auth.entity.AuthVerificationChallenge;

@Mapper
public interface AuthVerificationChallengeMapper extends BaseMapper<AuthVerificationChallenge> {

    @Select("SELECT * FROM ap_auth_verification_challenge WHERE channel = #{channel} AND purpose = #{purpose} AND destination = #{destination} AND deleted = 0 ORDER BY created_at DESC LIMIT 1")
    AuthVerificationChallenge selectLatest(@Param("channel") String channel,
                                            @Param("purpose") String purpose,
                                            @Param("destination") String destination);

    @Select("SELECT COUNT(1) FROM ap_auth_verification_challenge WHERE channel = #{channel} AND purpose = #{purpose} AND destination = #{destination} AND created_at >= CURRENT_TIMESTAMP - INTERVAL '60 seconds' AND deleted = 0")
    long countRecent(@Param("channel") String channel,
                     @Param("purpose") String purpose,
                     @Param("destination") String destination);
}
