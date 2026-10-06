package dev.hucoo.common.infrastructure.repository;

import java.util.List;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.common.domain.entity.CommonRecord;

public interface CommonRepository<T extends CommonRecord> {
    List<T> list(boolean platform, CommonFilter filter);

    PageResult<T> page(boolean platform, CommonFilter filter, long page, long size);

    T find(boolean platform, Long id);

    T lock(Long id);

    T insert(T entity);

    T update(T entity);

    void delete(T entity);
}
