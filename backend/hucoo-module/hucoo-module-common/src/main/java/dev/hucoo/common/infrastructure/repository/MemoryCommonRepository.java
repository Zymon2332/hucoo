package dev.hucoo.common.infrastructure.repository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.BeanWrapperImpl;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.common.domain.entity.CommonRecord;

/**
 * Detached copies and synchronized writes preserve uniqueness and optimistic-lock semantics.
 */
public class MemoryCommonRepository<T extends CommonRecord> implements CommonRepository<T> {
    private final Map<Long, T> records = new HashMap<>();
    private final Supplier<T> factory;
    private final RecordDefinition definition;

    public MemoryCommonRepository(Supplier<T> factory, RecordDefinition definition) {
        this.factory = factory;
        this.definition = definition;
    }

    private T copy(T entity) {
        T copy = factory.get();
        BeanUtils.copyProperties(entity, copy);
        return copy;
    }

    private Object property(T entity, String name) {
        return new BeanWrapperImpl(entity).getPropertyValue(name);
    }

    private boolean visible(T row, boolean platform) {
        String tenant = platform ? PlatformConstants.SYSTEM_TENANT_ID : CurrentTenantContext.getTenantId();
        return Objects.equals(tenant, row.getTenantId()) && Objects.equals(0, row.getDeleted());
    }

    @SuppressWarnings("unchecked")
    private int compare(T left, T right) {
        for (String property : definition.orderProperties()) {
            int cmp = ((Comparable<Object>) property(left, property)).compareTo(property(right, property));
            if (cmp != 0) return cmp;
        }
        return 0;
    }

    public synchronized List<T> list(boolean platform, CommonFilter filter) {
        return records.values().stream().filter(row -> visible(row, platform))
                .filter(row -> filter.equalities().entrySet().stream().allMatch(e -> Objects.equals(property(row, e.getKey()), e.getValue())))
                .filter(row -> filter.enabled() == null || Objects.equals(row.getEnabled(), filter.enabled()))
                .filter(row -> filter.keyword() == null || filter.keyword().isBlank() || definition.searchProperties().stream()
                        .anyMatch(p -> String.valueOf(property(row, p)).contains(filter.keyword())))
                .sorted(this::compare).map(this::copy).toList();
    }

    public synchronized PageResult<T> page(boolean platform, CommonFilter filter, long page, long size) {
        List<T> rows = list(platform, filter);
        // Avoid overflow for arbitrarily large page numbers.
        long offset = page > Long.MAX_VALUE / size ? Long.MAX_VALUE : (page - 1) * size;
        int from = (int) Math.min(offset, rows.size());
        int to = (int) Math.min((long) from + size, rows.size());
        return PageResult.of(rows.subList(from, to), rows.size(), page, size);
    }

    public synchronized T find(boolean platform, Long id) {
        T row = records.get(id);
        return row != null && visible(row, platform) ? copy(row) : null;
    }

    public synchronized T lock(Long id) {
        return find(false, id);
    }

    public synchronized T insert(T entity) {
        entity.setTenantId(CurrentTenantContext.getTenantId());
        boolean duplicate = records.values().stream().filter(row -> visible(row, false))
                .anyMatch(row -> definition.uniqueProperties().stream().allMatch(p -> Objects.equals(property(row, p), property(entity, p))));
        if (duplicate) throw new BusinessException(CommonErrorCode.CONFLICT, "编码或键已存在");
        entity.setId(IdGenerator.nextId());
        entity.setVersion(0);
        entity.setDeleted(0);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(entity.getCreatedAt());
        records.put(entity.getId(), copy(entity));
        return copy(entity);
    }

    private void assertVersion(T entity) {
        T current = records.get(entity.getId());
        if (current == null || !visible(current, false) || !Objects.equals(current.getVersion(), entity.getVersion()))
            throw new BusinessException(CommonErrorCode.CONFLICT, "记录已被修改，请重新读取");
    }

    public synchronized T update(T entity) {
        assertVersion(entity);
        entity.setVersion(entity.getVersion() + 1);
        entity.setUpdatedAt(LocalDateTime.now());
        records.put(entity.getId(), copy(entity));
        return copy(entity);
    }

    public synchronized void delete(T entity) {
        assertVersion(entity);
        entity.setDeleted(1);
        entity.setVersion(entity.getVersion() + 1);
        entity.setUpdatedAt(LocalDateTime.now());
        records.put(entity.getId(), copy(entity));
    }
}
