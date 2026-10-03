package dev.hucoo.admin.operations.application;

import java.util.Map;
import dev.hucoo.commons.dto.PageResult;

public interface ExperimentCatalogFacade {
    PageResult<Map<String, Object>> page();
    void updateStatus(Long id, String status);
}
