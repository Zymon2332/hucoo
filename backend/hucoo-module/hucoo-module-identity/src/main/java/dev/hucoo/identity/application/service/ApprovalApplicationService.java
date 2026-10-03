package dev.hucoo.identity.application.service;

import java.time.LocalDateTime;
import java.util.List;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.identity.api.ApprovalFacade;
import dev.hucoo.identity.api.dto.ApprovalActionRequest;
import dev.hucoo.identity.api.dto.ApprovalDTO;
import dev.hucoo.identity.api.dto.ApprovalQueryRequest;
import dev.hucoo.identity.application.converter.ApprovalConverter;
import dev.hucoo.identity.domain.entity.Approval;
import dev.hucoo.identity.domain.entity.ApprovalStep;
import dev.hucoo.commons.exception.CommonErrorCode;

public interface ApprovalApplicationService extends IService<Approval>, ApprovalFacade {

    ApprovalConverter converter();

    List<ApprovalStep> findSteps(Long approvalId);

    boolean transition(Long id, String status, String action, String comment);

    @Override
    default PageResult<ApprovalDTO> pageDtos(ApprovalQueryRequest request) {
        Page<Approval> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(entity -> toDto(entity, false)).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default ApprovalDTO getDto(Long id) {
        Approval entity = getById(id);
        if (entity == null) {
            throw new BusinessException(CommonErrorCode.APPROVAL_NOT_FOUND,
                    "审批申请(" + id + ") 不存在");
        }
        return toDto(entity, true);
    }

    @Override
    default ApprovalDTO approve(Long id, ApprovalActionRequest request) {
        transition(id, "APPROVED", "APPROVE", request == null ? null : request.getReason());
        return getDto(id);
    }

    @Override
    default ApprovalDTO reject(Long id, ApprovalActionRequest request) {
        transition(id, "REJECTED", "REJECT", request == null ? null : request.getReason());
        return getDto(id);
    }

    @Override
    default ApprovalDTO withdraw(Long id) {
        transition(id, "WITHDRAWN", "WITHDRAW", null);
        return getDto(id);
    }

    default ApprovalDTO toDto(Approval entity, boolean withSteps) {
        ApprovalDTO dto = converter().toDto(entity);
        if (withSteps) {
            dto.setSteps(findSteps(entity.getId()).stream().map(converter()::toStepDto).toList());
        }
        return dto;
    }

    default void assertPending(Approval entity) {
        if (!"PENDING".equalsIgnoreCase(entity.getStatus())) {
            throw new BusinessException(CommonErrorCode.APPROVAL_STATE_CONFLICT,
                    "审批申请当前状态不允许执行该操作");
        }
    }

    default void complete(Approval entity, String status) {
        entity.setStatus(status);
        entity.setCompletedAt(LocalDateTime.now());
        updateById(entity);
    }

    @Override
    default Class<Approval> getEntityClass() {
        return Approval.class;
    }
}
