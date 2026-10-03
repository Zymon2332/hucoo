package dev.hucoo.identity.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.identity.api.dto.ApprovalDTO;
import dev.hucoo.identity.api.dto.ApprovalQueryRequest;
import dev.hucoo.identity.application.converter.ApprovalConverter;
import dev.hucoo.identity.application.service.ApprovalApplicationService;
import dev.hucoo.identity.domain.entity.Approval;
import dev.hucoo.identity.domain.entity.ApprovalStep;
import dev.hucoo.identity.infrastructure.mapper.ApprovalMapper;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockApprovalApplicationService extends ServiceImpl<ApprovalMapper, Approval>
        implements ApprovalApplicationService {

    private final Map<Long, Approval> store = new ConcurrentHashMap<>();
    private final Map<Long, List<ApprovalStep>> stepStore = new ConcurrentHashMap<>();
    private final ApprovalConverter approvalConverter;

    public MockApprovalApplicationService(ApprovalConverter approvalConverter) {
        this.approvalConverter = approvalConverter;
        seed();
    }

    @Override
    public ApprovalConverter converter() {
        return approvalConverter;
    }

    private void seed() {
        Approval pending = approval("MODEL_REGISTRATION", "CUSTOM_MODEL", "model-001", "PENDING");
        addStep(pending, 1, "PENDING");
        Approval approved = approval("MCP_REGISTRATION", "MCP_SERVER", "mcp-001", "APPROVED");
        addStep(approved, 1, "APPROVED");
    }

    private Approval approval(String type, String resourceType, String resourceId, String status) {
        Approval approval = new Approval();
        approval.setId(IdGenerator.nextId());
        approval.setApprovalType(type);
        approval.setResourceType(resourceType);
        approval.setResourceId(resourceId);
        approval.setApplicantId(10001L);
        approval.setStatus(status);
        approval.setReason("待管理员审核");
        approval.setSubmittedAt(LocalDateTime.now().minusHours(2));
        approval.setCreatedAt(LocalDateTime.now().minusHours(2));
        approval.setUpdatedAt(LocalDateTime.now().minusHours(2));
        approval.setDeleted(0);
        store.put(approval.getId(), approval);
        return approval;
    }

    private void addStep(Approval approval, int stepNo, String status) {
        ApprovalStep step = new ApprovalStep();
        step.setId(IdGenerator.nextId());
        step.setApprovalId(approval.getId());
        step.setStepNo(stepNo);
        step.setApproverId(20001L);
        step.setStatus(status);
        step.setAction("APPROVED".equals(status) ? "APPROVE" : null);
        step.setActedAt("APPROVED".equals(status) ? LocalDateTime.now().minusHours(1) : null);
        step.setCreatedAt(approval.getCreatedAt());
        step.setUpdatedAt(approval.getUpdatedAt());
        stepStore.computeIfAbsent(approval.getId(), ignored -> new ArrayList<>()).add(step);
    }

    @Override
    public Approval getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean updateById(Approval entity) {
        if (entity.getId() == null || !store.containsKey(entity.getId())) {
            return false;
        }
        entity.setUpdatedAt(LocalDateTime.now());
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public <E extends IPage<Approval>> E page(E page) {
        List<Approval> all = new ArrayList<>(store.values()).stream()
                .sorted(Comparator.comparing(Approval::getId).reversed()).toList();
        long current = page.getCurrent();
        long size = page.getSize();
        int from = (int) Math.max(0L, (current - 1) * size);
        int to = (int) Math.min(all.size(), from + size);
        page.setTotal(all.size());
        page.setRecords(from >= all.size() ? List.of() : all.subList(from, to));
        return page;
    }

    @Override
    public PageResult<ApprovalDTO> pageDtos(ApprovalQueryRequest request) {
        IPage<Approval> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(entity -> toDto(entity, false)).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public List<ApprovalStep> findSteps(Long approvalId) {
        return List.copyOf(stepStore.getOrDefault(approvalId, List.of()));
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
        findSteps(id).stream().filter(item -> "PENDING".equalsIgnoreCase(item.getStatus())).findFirst()
                .ifPresent(step -> {
                    step.setStatus(status);
                    step.setAction(action);
                    step.setComment(comment);
                    step.setActedAt(LocalDateTime.now());
                });
        return true;
    }
}
