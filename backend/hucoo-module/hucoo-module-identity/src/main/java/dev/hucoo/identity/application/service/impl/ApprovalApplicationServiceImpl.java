package dev.hucoo.identity.application.service.impl;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.identity.application.converter.ApprovalConverter;
import dev.hucoo.identity.application.service.ApprovalApplicationService;
import dev.hucoo.identity.domain.entity.Approval;
import dev.hucoo.identity.domain.entity.ApprovalStep;
import dev.hucoo.identity.infrastructure.mapper.ApprovalMapper;
import dev.hucoo.identity.infrastructure.mapper.ApprovalStepMapper;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class ApprovalApplicationServiceImpl extends ServiceImpl<ApprovalMapper, Approval>
        implements ApprovalApplicationService {

    private final ApprovalConverter approvalConverter;
    private final ApprovalStepMapper approvalStepMapper;

    public ApprovalApplicationServiceImpl(ApprovalConverter approvalConverter, ApprovalStepMapper approvalStepMapper) {
        this.approvalConverter = approvalConverter;
        this.approvalStepMapper = approvalStepMapper;
    }

    @Override
    public ApprovalConverter converter() {
        return approvalConverter;
    }

    @Override
    public List<ApprovalStep> findSteps(Long approvalId) {
        return approvalStepMapper.selectList(new LambdaQueryWrapper<ApprovalStep>()
                .eq(ApprovalStep::getApprovalId, approvalId)
                .orderByAsc(ApprovalStep::getStepNo));
    }

    @Override
    public boolean transition(Long id, String status, String action, String comment) {
        Approval approval = getById(id);
        if (approval == null) {
            throw new BusinessException(CommonErrorCode.APPROVAL_NOT_FOUND, "审批申请(" + id + ") 不存在");
        }
        assertPending(approval);
        approval.setReason(comment);
        complete(approval, status);
        ApprovalStep step = findSteps(id).stream().filter(item -> "PENDING".equalsIgnoreCase(item.getStatus()))
                .findFirst().orElse(null);
        if (step != null) {
            step.setStatus(status);
            step.setAction(action);
            step.setComment(comment);
            step.setActedAt(LocalDateTime.now());
            approvalStepMapper.updateById(step);
        }
        return true;
    }
}
