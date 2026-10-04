package dev.hucoo.file.application.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.file.api.FileObjectFacade;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.api.dto.FileObjectUpdateRequest;
import dev.hucoo.file.api.dto.FileRegisterRequest;
import dev.hucoo.file.application.converter.FileObjectConverter;
import dev.hucoo.file.domain.entity.FileObject;
import dev.hucoo.file.domain.enums.FileScanStatus;
import dev.hucoo.file.domain.enums.FileSource;
import dev.hucoo.file.domain.enums.FileStatus;
import dev.hucoo.file.domain.enums.FileVisibility;

/**
 * 文件元数据应用服务。
 *
 * <p>与其它业务模块一致：接口提供默认实现，持久化实现（{@code impl}）与内存实现（{@code mock}）
 * 各自覆盖 {@code IService} 的存取方法。
 */
public interface FileObjectApplicationService extends IService<FileObject>, FileObjectFacade {

    FileObjectConverter converter();

    @Override
    default PageResult<FileObjectDTO> pageDtos(FileObjectQueryRequest request) {
        Page<FileObject> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default FileObjectDTO getDto(Long id) {
        FileObject entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("FileObject", id);
        }
        return converter().toDto(entity);
    }

    /**
     * 匿名签名下载专用查询：不含租户条件。
     *
     * <p>匿名请求没有登录态，租户上下文会回落为系统租户，持久化实现必须改用忽略租户的查询。
     */
    default FileObjectDTO getDtoIgnoreTenant(Long id) {
        return getDto(id);
    }

    @Override
    default FileObjectDTO update(Long id, FileObjectUpdateRequest request) {
        FileObject entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("FileObject", id);
        }
        if (request.getVisibility() != null && FileVisibility.of(request.getVisibility()) == null) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "visibility 取值非法: " + request.getVisibility());
        }
        converter().update(request, entity);
        updateById(entity);
        return converter().toDto(entity);
    }

    /** 移入回收站（对象保留，等待延迟物理删除）。 */
    @Override
    default boolean remove(Long id) {
        FileObject entity = getById(id);
        if (entity == null) {
            return false;
        }
        entity.setStatus(FileStatus.RECYCLING.name());
        return updateById(entity);
    }

    /** 回收站还原。 */
    default FileObjectDTO restore(Long id) {
        FileObject entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("FileObject", id);
        }
        if (FileStatus.RECYCLING.name().equals(entity.getStatus())) {
            entity.setStatus(FileStatus.NORMAL.name());
            updateById(entity);
        }
        return converter().toDto(entity);
    }

    /** 记录一次下载（计数与访问时间）。 */
    default void markDownloaded(Long id) {
        FileObject entity = getById(id);
        if (entity == null) {
            return;
        }
        entity.setDownloadCount(entity.getDownloadCount() == null ? 1L : entity.getDownloadCount() + 1);
        entity.setLastAccessAt(java.time.LocalDateTime.now());
        updateById(entity);
    }

    /**
     * 匿名分享下载计数：持久化实现必须跳过租户条件。
     *
     * <p>匿名请求的租户上下文是系统租户，带租户条件的 UPDATE 会静默更新 0 行。
     */
    default void markDownloadedIgnoreTenant(Long id) {
        markDownloaded(id);
    }

    @Override
    default FileObjectDTO register(FileRegisterRequest request) {
        FileObject entity = new FileObject();
        entity.setStorageType(request.getStorageType() == null ? "UNKNOWN" : request.getStorageType().toUpperCase());
        entity.setBucketName(request.getBucketName());
        entity.setObjectKey(request.getObjectKey());
        entity.setFileName(request.getFileName());
        entity.setDisplayName(request.getDisplayName() == null ? request.getFileName() : request.getDisplayName());
        entity.setExtension(extensionOf(request.getFileName()));
        entity.setContentType(request.getContentType());
        entity.setSizeBytes(request.getSizeBytes());
        entity.setSha256(request.getSha256());
        entity.setEtag(request.getEtag());
        entity.setVisibility(request.getVisibility() == null
                ? FileVisibility.PRIVATE.name() : request.getVisibility().toUpperCase());
        entity.setStatus(FileStatus.NORMAL.name());
        entity.setScanStatus(FileScanStatus.SKIPPED.name());
        entity.setBizType(request.getBizType());
        entity.setBizId(request.getBizId());
        entity.setSource(request.getSource() == null ? FileSource.IMPORT.name() : request.getSource().toUpperCase());
        entity.setRefCount(1);
        entity.setDownloadCount(0L);
        entity.setMetadata(request.getMetadata());
        save(entity);
        return converter().toDto(entity);
    }

    private static String extensionOf(String fileName) {
        if (fileName == null) {
            return null;
        }
        int index = fileName.lastIndexOf('.');
        return index < 0 || index == fileName.length() - 1 ? null : fileName.substring(index + 1).toLowerCase();
    }

    @Override
    default Class<FileObject> getEntityClass() {
        return FileObject.class;
    }
}
