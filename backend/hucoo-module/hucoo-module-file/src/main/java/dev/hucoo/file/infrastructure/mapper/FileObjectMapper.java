package dev.hucoo.file.infrastructure.mapper;

import java.time.LocalDateTime;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import dev.hucoo.file.domain.entity.FileObject;

@Mapper
public interface FileObjectMapper extends BaseMapper<FileObject> {

    /**
     * 匿名签名链接下载专用查询：跳过多租户拦截器，租户归属由签名 token 自身保证。
     *
     * <p>匿名请求没有登录态，{@code CurrentTenantContext} 会回落为系统租户，
     * 若走拦截器会永远查不到数据，因此必须显式忽略租户条件。
     */
    @InterceptorIgnore(tenantLine = "true")
    @Select("SELECT * FROM ap_file_object WHERE id = #{id} AND deleted = 0")
    FileObject selectByIdIgnoreTenant(@Param("id") Long id);

    /**
     * 匿名下载计数：同样必须忽略租户条件，否则跨租户的分享下载会更新不到行（静默失败）。
     */
    @InterceptorIgnore(tenantLine = "true")
    @Update("""
            UPDATE ap_file_object
               SET download_count = COALESCE(download_count, 0) + 1,
                   last_access_at = #{accessedAt},
                   updated_at     = #{accessedAt}
             WHERE id = #{id}
               AND deleted = 0
            """)
    int incrementDownloadCountIgnoreTenant(@Param("id") Long id, @Param("accessedAt") LocalDateTime accessedAt);
}
