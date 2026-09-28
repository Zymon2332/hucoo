package dev.hucoo.identity.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.identity.domain.entity.UserAccount;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface UserAccountMapper extends BaseMapper<UserAccount> {
}
