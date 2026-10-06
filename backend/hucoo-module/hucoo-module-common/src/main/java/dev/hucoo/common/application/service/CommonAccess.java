package dev.hucoo.common.application.service;

import java.util.Objects;

import org.springframework.beans.factory.ObjectProvider;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.common.api.dto.CommonScope;
import dev.hucoo.common.domain.entity.CommonRecord;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.config.SecurityProperties;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.security.interceptor.PermissionResolver;

public class CommonAccess {
    private final SecurityProperties security;
    private final ObjectProvider<PermissionResolver> permissions;

    public CommonAccess(SecurityProperties security, ObjectProvider<PermissionResolver> permissions) {
        this.security = security;
        this.permissions = permissions;
    }

    public boolean platform(CommonScope scope) {
        return scope == CommonScope.PLATFORM;
    }

    public void write(CommonScope scope, String resource) {
        boolean systemContext = PlatformConstants.SYSTEM_TENANT_ID.equals(CurrentTenantContext.getTenantId());
        if (platform(scope) && !systemContext)
            throw new BusinessException(CommonErrorCode.FORBIDDEN, "平台写入需要系统租户上下文");
        if (!systemContext || !security.isEnabled()) return;
        var user = CurrentUserContext.get();
        if (user == null) throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        if (!PlatformConstants.SYSTEM_TENANT_ID.equals(user.tenantId()) ||
                !permissions.getIfAvailable(PermissionResolver::jwtClaimsOnly).hasPermission(user, resource + ":platform:manage"))
            throw new BusinessException(CommonErrorCode.FORBIDDEN, "缺少平台管理权限");
    }

    public <T> T require(T record) {
        if (record == null) throw new BusinessException(CommonErrorCode.NOT_FOUND);
        return record;
    }

    public void version(CommonRecord record, Integer version) {
        if (version == null) throw new BusinessException(CommonErrorCode.BAD_REQUEST, "更新和删除必须提供 version");
        if (!Objects.equals(record.getVersion(), version))
            throw new BusinessException(CommonErrorCode.CONFLICT, "记录已被修改，请重新读取");
    }

    public void immutable(Object existing, Object requested, String name) {
        if (!Objects.equals(existing, requested))
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, name + "创建后不可修改");
    }
}
