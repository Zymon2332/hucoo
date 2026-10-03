package dev.hucoo.admin.operations.application;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.dto.PageResult;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockExperimentCatalogFacade implements ExperimentCatalogFacade {
    public PageResult<Map<String, Object>> page() { return PageResult.empty(1, 20); }
    public void updateStatus(Long id, String status) { }
}
