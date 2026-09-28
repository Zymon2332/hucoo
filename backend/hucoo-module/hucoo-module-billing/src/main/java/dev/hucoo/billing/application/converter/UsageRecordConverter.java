package dev.hucoo.billing.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.billing.api.dto.UsageRecordCreateRequest;
import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.domain.entity.UsageRecord;

@Mapper(componentModel = "spring")
public interface UsageRecordConverter {

    UsageRecordDTO toDto(UsageRecord entity);

    List<UsageRecordDTO> toDtoList(List<UsageRecord> entities);

    UsageRecord toEntity(UsageRecordCreateRequest request);

    void update(UsageRecordCreateRequest request, @MappingTarget UsageRecord entity);
}
