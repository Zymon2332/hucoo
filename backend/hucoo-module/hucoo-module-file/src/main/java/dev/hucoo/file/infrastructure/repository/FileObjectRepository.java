package dev.hucoo.file.infrastructure.repository;

import java.util.Optional;

import com.baomidou.mybatisplus.core.metadata.IPage;

import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.domain.entity.FileObject;

public interface FileObjectRepository {

    Optional<FileObject> findById(Long id);

    /** 匿名签名下载专用：忽略租户条件。 */
    Optional<FileObject> findByIdIgnoreTenant(Long id);

    /** 匿名签名下载计数：忽略租户条件。 */
    void incrementDownloadCountIgnoreTenant(Long id);

    boolean save(FileObject entity);

    boolean updateById(FileObject entity);

    boolean removeById(Long id);

    IPage<FileObject> page(long pageNum, long pageSize, FileObjectQueryRequest request);

    long count();
}
