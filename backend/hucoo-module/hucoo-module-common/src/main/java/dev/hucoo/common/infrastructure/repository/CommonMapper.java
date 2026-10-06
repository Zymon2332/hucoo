package dev.hucoo.common.infrastructure.repository;

import java.util.List;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Constants;
import org.apache.ibatis.annotations.Param;
import dev.hucoo.common.domain.entity.CommonRecord;

/**
 * Not a Mapper bean: only concrete, entity-specific interfaces are registered.
 */
public interface CommonMapper<T extends CommonRecord> extends BaseMapper<T> {
    List<T> platformList(@Param(Constants.WRAPPER) Wrapper<T> wrapper);

    long platformCount(@Param(Constants.WRAPPER) Wrapper<T> wrapper);

    IPage<T> platformPage(IPage<T> page, @Param(Constants.WRAPPER) Wrapper<T> wrapper);
}
