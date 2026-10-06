package dev.hucoo.common.infrastructure.mapper;

import java.util.List;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Constants;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import dev.hucoo.common.domain.entity.DictionaryItem;
import dev.hucoo.common.infrastructure.repository.CommonMapper;

public interface DictionaryItemMapper extends CommonMapper<DictionaryItem> {
    String PLATFORM_SQL = "SELECT * FROM (SELECT * FROM ap_common_dictionary_item WHERE tenant_id = '000000' AND deleted = 0) platform_records ${ew.customSqlSegment}";

    @Override
    @InterceptorIgnore(tenantLine = "true")
    @Select(PLATFORM_SQL)
    @Results({@Result(column = "item_label", property = "label"), @Result(column = "item_value", property = "value")})
    List<DictionaryItem> platformList(@Param(Constants.WRAPPER) Wrapper<DictionaryItem> wrapper);

    @Override
    @InterceptorIgnore(tenantLine = "true")
    @Select(PLATFORM_SQL)
    @Results({@Result(column = "item_label", property = "label"), @Result(column = "item_value", property = "value")})
    IPage<DictionaryItem> platformPage(IPage<DictionaryItem> page, @Param(Constants.WRAPPER) Wrapper<DictionaryItem> wrapper);

    @Override
    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT COUNT(*) FROM (" + PLATFORM_SQL + ") platform_count")
    long platformCount(@Param(Constants.WRAPPER) Wrapper<DictionaryItem> wrapper);
}
