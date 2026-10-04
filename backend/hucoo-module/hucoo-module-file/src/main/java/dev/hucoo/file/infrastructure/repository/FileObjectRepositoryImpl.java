package dev.hucoo.file.infrastructure.repository;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.domain.entity.FileObject;
import dev.hucoo.file.infrastructure.mapper.FileObjectMapper;

@Repository
public class FileObjectRepositoryImpl implements FileObjectRepository {

    private final FileObjectMapper fileObjectMapper;

    public FileObjectRepositoryImpl(FileObjectMapper fileObjectMapper) {
        this.fileObjectMapper = fileObjectMapper;
    }

    @Override
    public Optional<FileObject> findById(Long id) {
        return Optional.ofNullable(id == null ? null : fileObjectMapper.selectById(id));
    }

    @Override
    public Optional<FileObject> findByIdIgnoreTenant(Long id) {
        return Optional.ofNullable(id == null ? null : fileObjectMapper.selectByIdIgnoreTenant(id));
    }

    @Override
    public void incrementDownloadCountIgnoreTenant(Long id) {
        if (id != null) {
            fileObjectMapper.incrementDownloadCountIgnoreTenant(id, java.time.LocalDateTime.now());
        }
    }

    @Override
    public boolean save(FileObject entity) {
        return fileObjectMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(FileObject entity) {
        return fileObjectMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return fileObjectMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<FileObject> page(long pageNum, long pageSize, FileObjectQueryRequest request) {
        LambdaQueryWrapper<FileObject> wrapper = new LambdaQueryWrapper<>();
        if (request != null) {
            String keyword = request.getKeyword();
            if (StringUtil.isNotBlank(keyword)) {
                wrapper.and(condition -> condition
                        .like(FileObject::getFileName, keyword)
                        .or()
                        .like(FileObject::getDisplayName, keyword)
                        .or()
                        .like(FileObject::getObjectKey, keyword));
            }
            wrapper.eq(StringUtil.isNotBlank(request.getExtension()), FileObject::getExtension, request.getExtension())
                    .eq(StringUtil.isNotBlank(request.getBizType()), FileObject::getBizType, request.getBizType())
                    .eq(StringUtil.isNotBlank(request.getBizId()), FileObject::getBizId, request.getBizId())
                    .eq(StringUtil.isNotBlank(request.getStatus()), FileObject::getStatus, request.getStatus())
                    .eq(StringUtil.isNotBlank(request.getVisibility()), FileObject::getVisibility, request.getVisibility())
                    .eq(StringUtil.isNotBlank(request.getStorageType()), FileObject::getStorageType, request.getStorageType())
                    .eq(request.getOwnerId() != null, FileObject::getOwnerId, request.getOwnerId())
                    .ge(request.getMinSize() != null, FileObject::getSizeBytes, request.getMinSize())
                    .le(request.getMaxSize() != null, FileObject::getSizeBytes, request.getMaxSize())
                    .ge(request.getCreatedFrom() != null, FileObject::getCreatedAt, request.getCreatedFrom())
                    .le(request.getCreatedTo() != null, FileObject::getCreatedAt, request.getCreatedTo());
        }
        wrapper.orderByDesc(FileObject::getCreatedAt);
        return fileObjectMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return fileObjectMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
