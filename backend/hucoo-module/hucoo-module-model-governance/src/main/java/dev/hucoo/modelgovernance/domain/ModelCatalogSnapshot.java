package dev.hucoo.modelgovernance.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.domain.entity.*;

/** 单次查询的只读数据集合；不暴露给客户端，也不持有仓储引用。 */
public final class ModelCatalogSnapshot {
    private static final List<Class<? extends BaseEntity>> TYPES = List.of(
            LogicalModel.class, ModelVersion.class, ModelProvider.class, ModelChannel.class,
            ModelChannelBinding.class, ModelVersionCapability.class, ModelVisibilityGrant.class,
            ModelValidationRun.class, ModelCredential.class, ModelRoutePolicy.class, ModelRouteTarget.class);
    private final Map<Class<? extends BaseEntity>, List<? extends BaseEntity>> tables;

    private ModelCatalogSnapshot(Map<Class<? extends BaseEntity>, List<? extends BaseEntity>> tables) {
        this.tables = Map.copyOf(tables);
    }

    @SuppressWarnings("unchecked")
    public <T extends BaseEntity> List<T> list(Class<T> type) {
        return (List<T>) tables.getOrDefault(type, List.of());
    }

    /** 保留租户拦截器：分别在系统租户和登录租户读取，并始终恢复原上下文。 */
    public static ModelCatalogSnapshot load(ModelCatalogRepository repository, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) throw new IllegalArgumentException("缺少目录租户");
        String previous = CurrentTenantContext.getTenantIdOrNull();
        try {
            Map<Class<? extends BaseEntity>, List<? extends BaseEntity>> tables = new LinkedHashMap<>();
            for (Class<? extends BaseEntity> type : TYPES) {
                List<BaseEntity> rows = new ArrayList<>();
                CurrentTenantContext.set(PlatformConstants.SYSTEM_TENANT_ID);
                rows.addAll(repository.list(type));
                if (!PlatformConstants.SYSTEM_TENANT_ID.equals(tenantId)) {
                    CurrentTenantContext.set(tenantId);
                    rows.addAll(repository.list(type));
                }
                tables.put(type, rows.stream().filter(row -> Integer.valueOf(0).equals(row.getDeleted())).toList());
            }
            return new ModelCatalogSnapshot(tables);
        } finally {
            if (previous == null) CurrentTenantContext.clear();
            else CurrentTenantContext.set(previous);
        }
    }
}
