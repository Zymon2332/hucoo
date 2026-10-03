package dev.hucoo.identity.application.converter;

import org.mapstruct.Mapper;

import dev.hucoo.identity.api.dto.ApprovalDTO;
import dev.hucoo.identity.api.dto.ApprovalStepDTO;
import dev.hucoo.identity.domain.entity.Approval;
import dev.hucoo.identity.domain.entity.ApprovalStep;

@Mapper(componentModel = "spring")
public interface ApprovalConverter {

    ApprovalDTO toDto(Approval entity);

    ApprovalStepDTO toStepDto(ApprovalStep entity);
}
