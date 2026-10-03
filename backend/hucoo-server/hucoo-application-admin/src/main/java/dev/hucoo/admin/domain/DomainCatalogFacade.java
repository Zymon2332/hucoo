package dev.hucoo.admin.domain;

import java.util.Map;
import dev.hucoo.commons.dto.PageResult;

public interface DomainCatalogFacade {
    PageResult<Map<String, Object>> page(String resource, String keyword, long page, long size);
    Map<String, Object> get(String resource, Long id);
    Map<String, Object> create(String resource, Map<String, Object> values);
    Map<String, Object> update(String resource, Long id, Map<String, Object> values);
    boolean delete(String resource, Long id, Integer version);
    Map<String, Object> action(String resource, Long id, String action, Map<String, Object> values);
}
