package dev.hucoo.common.infrastructure.repository;

import java.util.List;

import dev.hucoo.component.database.tenant.CurrentTenantContext;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.common.domain.entity.CommonRecord;
import org.springframework.dao.DataIntegrityViolationException;

public class DatabaseCommonRepository<T extends CommonRecord> implements CommonRepository<T> {
    private final CommonMapper<T> mapper;
    private final RecordDefinition definition;

    public DatabaseCommonRepository(CommonMapper<T> mapper, RecordDefinition definition) {
        this.mapper = mapper;
        this.definition = definition;
    }

    private QueryWrapper<T> query(CommonFilter filter, boolean platform) {
        QueryWrapper<T> wrapper = new QueryWrapper<>();
        if (!platform) wrapper.eq("tenant_id", CurrentTenantContext.getTenantId());
        filter.equalities().forEach((property, value) -> wrapper.eq(definition.column(property), value));
        if (filter.enabled() != null) wrapper.eq("enabled", filter.enabled());
        if (filter.keyword() != null && !filter.keyword().isBlank()) {
            // Escape LIKE wildcards so SQL and in-memory searches both use literal substrings.
            String keyword = filter.keyword().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            wrapper.and(w -> {
                for (String property : definition.searchProperties()) w.or().like(definition.column(property), keyword);
            });
        }
        for (String property : definition.orderProperties()) wrapper.orderByAsc(definition.column(property));
        return wrapper;
    }

    public List<T> list(boolean platform, CommonFilter filter) {
        return platform ? mapper.platformList(query(filter, platform)) : mapper.selectList(query(filter, platform));
    }

    public PageResult<T> page(boolean platform, CommonFilter filter, long page, long size) {
        if (platform) {
            // The pagination interceptor's generated count statement loses @InterceptorIgnore.
            // Count through its own fixed-scope mapped statement instead.
            long total = mapper.platformCount(query(filter, true));
            if (page > Long.MAX_VALUE / size || (page - 1) * size >= total)
                return PageResult.of(List.of(), total, page, size);
            Page<T> request = new Page<>(page, size, false);
            request.setTotal(total);
            var result = mapper.platformPage(request, query(filter, true));
            return PageResult.of(result.getRecords(), total, page, size);
        }
        var result = mapper.selectPage(new Page<T>(page, size), query(filter, false));
        return PageResult.of(result.getRecords(), result.getTotal(), result.getCurrent(), result.getSize());
    }

    public T find(boolean platform, Long id) {
        List<T> rows = list(platform, CommonFilter.equal("id", id));
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public T lock(Long id) {
        return mapper.selectOne(new QueryWrapper<T>().eq("tenant_id", CurrentTenantContext.getTenantId()).eq("id", id).last("FOR UPDATE"));
    }

    public T insert(T entity) {
        try {
            mapper.insert(entity);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(CommonErrorCode.CONFLICT, "编码或键已存在", e);
        }
        return entity;
    }

    public T update(T entity) {
        try {
            if (mapper.updateById(entity) != 1)
                throw new BusinessException(CommonErrorCode.CONFLICT, "记录已被修改，请重新读取");
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(CommonErrorCode.CONFLICT, "编码或键已存在", e);
        }
        return find(false, entity.getId());
    }

    public void delete(T entity) {
        if (mapper.delete(new QueryWrapper<T>().eq("id", entity.getId()).eq("version", entity.getVersion())) != 1)
            throw new BusinessException(CommonErrorCode.CONFLICT, "记录已被修改，请重新读取");
    }
}
