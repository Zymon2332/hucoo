package dev.hucoo.modelgovernance.infrastructure.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;

@Repository
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryModelCatalogRepository implements ModelCatalogRepository {
    private final Map<Class<?>, Map<Long, String>> tables = new ConcurrentHashMap<>();

    @Override
    public synchronized <T> T inTransaction(java.util.function.Supplier<T> operation) {
        Map<Class<?>, Map<Long, String>> snapshot = new java.util.HashMap<>();
        tables.forEach((type, values) -> snapshot.put(type, new ConcurrentHashMap<>(values)));
        try { return operation.get(); }
        catch (RuntimeException error) { tables.clear(); tables.putAll(snapshot); throw error; }
    }

    private Map<Long, String> table(Class<?> type) { return tables.computeIfAbsent(type, ignored -> new ConcurrentHashMap<>()); }

    @Override
    public synchronized <T extends BaseEntity> T find(Class<T> type, Long id) {
        String json = table(type).get(id);
        T entity = json == null ? null : JsonUtil.parse(json, type);
        return entity != null && CurrentTenantContext.getTenantId().equals(entity.getTenantId()) ? entity : null;
    }

    @Override
    public synchronized <T extends BaseEntity> T lock(Class<T> type, Long id) { return find(type, id); }

    @Override
    public synchronized <T extends BaseEntity> List<T> list(Class<T> type) {
        return table(type).values().stream().map(json -> JsonUtil.parse(json, type))
                .filter(entity -> CurrentTenantContext.getTenantId().equals(entity.getTenantId()))
                .sorted(java.util.Comparator.comparing(BaseEntity::getId)).toList();
    }

    @Override
    public synchronized <T extends BaseEntity> T save(T entity) {
        LocalDateTime now = LocalDateTime.now();
        if (entity.getId() == null) {
            entity.setId(IdGenerator.nextId());
            entity.setTenantId(CurrentTenantContext.getTenantId());
            entity.setCreatedAt(now);
            entity.setDeleted(0);
            entity.setVersion(0);
        } else {
            BaseEntity current = find(entity.getClass(), entity.getId());
            if (current == null) throw new ResourceNotFoundException(entity.getClass().getSimpleName(), entity.getId());
            if (!java.util.Objects.equals(current.getVersion(), entity.getVersion())) {
                throw new dev.hucoo.commons.exception.BusinessException(dev.hucoo.commons.exception.CommonErrorCode.CONFLICT, "配置已被修改，请重新读取后操作");
            }
            entity.setTenantId(current.getTenantId());
            entity.setCreatedAt(current.getCreatedAt());
            entity.setVersion(current.getVersion() + 1);
        }
        entity.setUpdatedAt(now);
        table(entity.getClass()).put(entity.getId(), JsonUtil.toJson(entity));
        return entity;
    }

    @Override
    public synchronized <T extends BaseEntity> void delete(Class<T> type, Long id) {
        if (find(type, id) == null) throw new ResourceNotFoundException(type.getSimpleName(), id);
        table(type).remove(id);
    }
}
