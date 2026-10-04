package dev.hucoo.file.application.support;

import java.util.Optional;

import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import dev.hucoo.commons.api.AuditEventPublisher;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.security.context.CurrentUserContext;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 文件操作审计。审计实现由 {@code hucoo-module-audit} 提供，缺失时静默跳过 —— 模块之间不直接依赖。
 */
@Component
public class FileAuditSupport {

    private final ObjectProvider<AuditEventPublisher> auditPublisher;

    public FileAuditSupport(ObjectProvider<AuditEventPublisher> auditPublisher) {
        this.auditPublisher = auditPublisher;
    }

    public void publish(String action, String resourceId, int result) {
        publish(action, resourceId, result, CurrentUserContext.tenantId());
    }

    /**
     * 指定租户的审计（匿名签名下载用：请求没有登录态，租户归属只能取自文件记录本身，
     * 否则审计会把跨租户的下载记到系统租户名下）。
     */
    public void publish(String action, String resourceId, int result, String tenantId) {
        AuditEventPublisher publisher = auditPublisher.getIfAvailable();
        if (publisher == null) {
            return;
        }
        HttpServletRequest request = null;
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            request = attributes.getRequest();
        }
        publisher.publish(new AuditEventPublisher.AuditEvent(
                CurrentUserContext.userId(),
                Optional.ofNullable(CurrentUserContext.get()).map(user -> user.username())
                        .orElse(PlatformConstants.DEFAULT_OPERATOR),
                tenantId,
                action,
                "FileObject",
                resourceId,
                result,
                request == null ? null : request.getRemoteAddr(),
                MDC.get(PlatformConstants.TRACE_ID_MDC_KEY)));
    }
}
