package dev.hucoo.file.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.application.converter.FileObjectConverter;
import dev.hucoo.file.application.service.FileObjectApplicationService;
import dev.hucoo.file.domain.entity.FileObject;
import dev.hucoo.file.infrastructure.mapper.FileObjectMapper;
import dev.hucoo.file.infrastructure.repository.FileObjectRepository;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class FileObjectApplicationServiceImpl extends ServiceImpl<FileObjectMapper, FileObject>
        implements FileObjectApplicationService {

    private final FileObjectRepository fileObjectRepository;
    private final FileObjectConverter fileObjectConverter;

    public FileObjectApplicationServiceImpl(FileObjectRepository fileObjectRepository,
                                            FileObjectConverter fileObjectConverter) {
        this.fileObjectRepository = fileObjectRepository;
        this.fileObjectConverter = fileObjectConverter;
    }

    @Override
    public FileObjectConverter converter() {
        return fileObjectConverter;
    }

    @Override
    public PageResult<FileObjectDTO> pageDtos(FileObjectQueryRequest request) {
        IPage<FileObject> page = fileObjectRepository.page(request.resolvePageNum(), request.resolvePageSize(), request);
        return PageResult.of(page.getRecords().stream().map(fileObjectConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public FileObjectDTO getDtoIgnoreTenant(Long id) {
        FileObject entity = fileObjectRepository.findByIdIgnoreTenant(id)
                .orElseThrow(() -> new ResourceNotFoundException("FileObject", id));
        return fileObjectConverter.toDto(entity);
    }

    @Override
    public void markDownloadedIgnoreTenant(Long id) {
        fileObjectRepository.incrementDownloadCountIgnoreTenant(id);
    }
}
