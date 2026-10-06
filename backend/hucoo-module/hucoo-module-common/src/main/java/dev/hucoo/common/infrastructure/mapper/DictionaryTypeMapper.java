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
import dev.hucoo.common.domain.entity.DictionaryType;
import dev.hucoo.common.infrastructure.repository.CommonMapper;

public interface DictionaryTypeMapper extends CommonMapper<DictionaryType> {
    String PLATFORM_SQL = "SELECT * FROM (SELECT * FROM ap_common_dictionary_type WHERE tenant_id = '000000' AND deleted = 0) platform_records ${ew.customSqlSegment}";

    @Override
    @InterceptorIgnore(tenantLine = "true")
    @Select(PLATFORM_SQL)
    @Results({@Result(column = "dictionary_code", property = "code"), @Result(column = "dictionary_name", property = "name")})
    List<DictionaryType> platformList(@Param(Constants.WRAPPER) Wrapper<DictionaryType> wrapper);

    @Override
    @InterceptorIgnore(tenantLine = "true")
    @Select(PLATFORM_SQL)
    @Results({@Result(column = "dictionary_code", property = "code"), @Result(column = "dictionary_name", property = "name")})
    IPage<DictionaryType> platformPage(IPage<DictionaryType> page, @Param(Constants.WRAPPER) Wrapper<DictionaryType> wrapper);

    @Override
    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT COUNT(*) FROM (" + PLATFORM_SQL + ") platform_count")
    long platformCount(@Param(Constants.WRAPPER) Wrapper<DictionaryType> wrapper);
}
