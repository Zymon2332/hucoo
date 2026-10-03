package dev.hucoo.admin.operations.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.AsyncJobContext;
import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.admin.operations.application.OperationsCatalogFacade;
import lombok.RequiredArgsConstructor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "运营管理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/operations")
@RequiredArgsConstructor
public class OperationsController {

    private final OperationsCatalogFacade catalog;

    @Operation(summary = "公告列表")
    @GetMapping("/announcements")
    public Result<PageResult<Map<String, Object>>> announcements() {
        return Result.ok(catalog.announcements());
    }

    @Operation(summary = "工单列表")
    @GetMapping("/tickets")
    public Result<PageResult<Map<String, Object>>> tickets() {
        return Result.ok(catalog.tickets());
    }

    @Operation(summary = "优惠券列表")
    @GetMapping("/coupons")
    public Result<PageResult<Map<String, Object>>> coupons() {
        return Result.ok(catalog.coupons());
    }

    @Operation(summary = "异步发布公告")
    @PostMapping("/announcements/{id}/publish")
    @RequirePermission("operations:announcement-publish")
    public Result<AsyncJobDTO> publishAnnouncement(@PathVariable Long id) {
        return Result.ok(AsyncJobExecutor.submit("公告发布已提交: " + id, context -> {
            catalog.publishAnnouncement(id); complete(context, "announcement", id);
        }));
    }

    @Operation(summary = "异步发送工单消息")
    @PostMapping("/tickets/{id}/messages")
    @RequirePermission("operations:ticket-message")
    public Result<AsyncJobDTO> sendTicketMessage(@PathVariable Long id,
                                                  @RequestBody Map<String, Object> request) {
        return Result.ok(AsyncJobExecutor.submit("工单消息发送已提交: " + id, context -> {
            context.checkCancelled();
            catalog.addTicketMessage(id, request);
            context.result("ticketId", id);
            context.result("messageAccepted", request != null && !request.isEmpty());
            context.progress(100, "工单消息已发送");
        }));
    }

    @Operation(summary = "异步启用优惠券")
    @PostMapping("/coupons/{id}/activate")
    @RequirePermission("operations:coupon-activate")
    public Result<AsyncJobDTO> activateCoupon(@PathVariable Long id) {
        return Result.ok(AsyncJobExecutor.submit("优惠券启用已提交: " + id, context -> {
            catalog.activateCoupon(id); complete(context, "coupon", id);
        }));
    }

    private void complete(AsyncJobContext context, String resourceType, Long id) {
        context.checkCancelled();
        context.progress(50, "校验运营资源状态");
        context.result("resourceType", resourceType);
        context.result("resourceId", id);
        context.result("status", "COMPLETED");
        context.progress(100, "运营操作完成");
    }
}
