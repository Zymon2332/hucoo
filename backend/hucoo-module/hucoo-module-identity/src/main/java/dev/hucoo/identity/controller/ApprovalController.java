package dev.hucoo.identity.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.identity.api.dto.ApprovalActionRequest;
import dev.hucoo.identity.api.dto.ApprovalDTO;
import dev.hucoo.identity.api.dto.ApprovalQueryRequest;
import dev.hucoo.identity.application.service.ApprovalApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "审批管理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalApplicationService approvalApplicationService;

    @Operation(summary = "分页查询审批申请")
    @GetMapping
    public Result<PageResult<ApprovalDTO>> page(ApprovalQueryRequest request) {
        return Result.ok(approvalApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询审批详情和步骤")
    @GetMapping("/{id}")
    public Result<ApprovalDTO> detail(@PathVariable Long id) {
        return Result.ok(approvalApplicationService.getDto(id));
    }

    @Operation(summary = "通过审批")
    @PostMapping("/{id}/approve")
    @RequirePermission("approval:approve")
    public Result<ApprovalDTO> approve(@PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request) {
        return Result.ok(approvalApplicationService.approve(id, request));
    }

    @Operation(summary = "拒绝审批")
    @PostMapping("/{id}/reject")
    @RequirePermission("approval:reject")
    public Result<ApprovalDTO> reject(@PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequest request) {
        return Result.ok(approvalApplicationService.reject(id, request));
    }

    @Operation(summary = "撤回审批")
    @PostMapping("/{id}/withdraw")
    @RequirePermission("approval:withdraw")
    public Result<ApprovalDTO> withdraw(@PathVariable Long id) {
        return Result.ok(approvalApplicationService.withdraw(id));
    }
}
