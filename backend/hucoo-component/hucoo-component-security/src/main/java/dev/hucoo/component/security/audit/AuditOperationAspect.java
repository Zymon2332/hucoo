package dev.hucoo.component.security.audit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import dev.hucoo.commons.api.AuditEventPublisher;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;

import jakarta.servlet.http.HttpServletRequest;

@Aspect
@Component
public class AuditOperationAspect {

    private final ObjectProvider<AuditEventPublisher> publisher;

    public AuditOperationAspect(ObjectProvider<AuditEventPublisher> publisher) {
        this.publisher = publisher;
    }

    @Around("@annotation(requirePermission)")
    public Object publish(ProceedingJoinPoint joinPoint, RequirePermission requirePermission) throws Throwable {
        Object result = joinPoint.proceed();
        AuditEventPublisher audit = publisher.getIfAvailable();
        if (audit != null) {
            CurrentUser user = CurrentUserContext.get();
            HttpServletRequest request = currentRequest();
            String action = requirePermission.value().length == 0
                    ? joinPoint.getSignature().getName()
                    : requirePermission.value()[0];
            audit.publish(new AuditEventPublisher.AuditEvent(
                    user == null ? null : user.userId(),
                    user == null ? PlatformConstants.DEFAULT_OPERATOR : user.username(),
                    user == null ? PlatformConstants.SYSTEM_TENANT_ID : user.tenantId(),
                    action,
                    joinPoint.getTarget().getClass().getSimpleName(),
                    null,
                    1,
                    request == null ? null : request.getRemoteAddr(),
                    request == null ? null : request.getHeader(PlatformConstants.TRACE_ID_HEADER)));
        }
        return result;
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }
}
