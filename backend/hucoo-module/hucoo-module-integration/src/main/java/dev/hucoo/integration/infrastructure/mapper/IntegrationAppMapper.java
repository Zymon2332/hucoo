package dev.hucoo.integration.infrastructure.mapper;

import org.apache.ibatis.annotations.Mapper;

import dev.hucoo.integration.domain.entity.IntegrationApp;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface IntegrationAppMapper extends BaseMapper<IntegrationApp> {
}
