package dev.hucoo.admin.operations.application;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import dev.hucoo.admin.operations.domain.ExperimentRecord;
import dev.hucoo.admin.operations.infrastructure.ExperimentMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class ExperimentCatalogService implements ExperimentCatalogFacade {
    private final ExperimentMapper mapper;
    public ExperimentCatalogService(ExperimentMapper mapper) { this.mapper = mapper; }
    public PageResult<Map<String, Object>> page() {
        Page<ExperimentRecord> page = mapper.selectPage(new Page<>(1, 20), new QueryWrapper<ExperimentRecord>().orderByDesc("created_at"));
        return PageResult.of(page.getRecords().stream().map(this::map).toList(), page.getTotal(), 1, 20);
    }
    public void updateStatus(Long id, String status) {
        ExperimentRecord record = mapper.selectById(id);
        if (record == null) throw new ResourceNotFoundException("Experiment", id);
        record.setStatus(status); mapper.updateById(record);
    }
    private Map<String, Object> map(ExperimentRecord r) {
        Map<String, Object> m = new LinkedHashMap<>(); m.put("id", r.getId()); m.put("experimentKey", r.getExperimentKey());
        m.put("experimentName", r.getExperimentName()); m.put("experimentType", r.getExperimentType());
        m.put("trafficPercent", r.getTrafficPercent()); m.put("audience", r.getAudience()); m.put("metric", r.getMetric());
        m.put("status", r.getStatus()); m.put("createdAt", r.getCreatedAt()); m.put("updatedAt", r.getUpdatedAt()); return m;
    }
}
