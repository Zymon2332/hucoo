package dev.hucoo.billing.application.service;

import java.util.Map;

import dev.hucoo.billing.api.UsageRecordFacade;
import dev.hucoo.billing.api.dto.UsageRecordCreateRequest;
import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.api.dto.UsageRecordQueryRequest;
import dev.hucoo.billing.application.converter.UsageRecordConverter;
import dev.hucoo.billing.domain.entity.UsageRecord;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface UsageRecordApplicationService extends IService<UsageRecord>, UsageRecordFacade {

    UsageRecordConverter converter();

    @Override
    default PageResult<UsageRecordDTO> pageDtos(UsageRecordQueryRequest request) {
        Page<UsageRecord> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default UsageRecordDTO getDto(Long id) {
        UsageRecord entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("UsageRecord", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default UsageRecordDTO create(UsageRecordCreateRequest request) {
        UsageRecord entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default UsageRecordDTO update(Long id, UsageRecordCreateRequest request) {
        UsageRecord entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("UsageRecord", id);
        }
        converter().update(request, entity);
        updateById(entity);
        return converter().toDto(entity);
    }

    @Override
    default boolean remove(Long id) {
        return removeById(id);
    }

    @Override
    default Class<UsageRecord> getEntityClass() {
        return UsageRecord.class;
    }
}
