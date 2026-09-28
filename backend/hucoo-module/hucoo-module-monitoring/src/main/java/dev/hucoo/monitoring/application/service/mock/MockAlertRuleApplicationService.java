package dev.hucoo.monitoring.application.service.mock;

import java.math.BigDecimal;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.api.dto.AlertRuleQueryRequest;
import dev.hucoo.monitoring.application.converter.AlertRuleConverter;
import dev.hucoo.monitoring.application.service.AlertRuleApplicationService;
import dev.hucoo.monitoring.domain.entity.AlertRule;
import dev.hucoo.monitoring.infrastructure.mapper.AlertRuleMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockAlertRuleApplicationService extends ServiceImpl<AlertRuleMapper, AlertRule>
        implements AlertRuleApplicationService {

    private final Map<Long, AlertRule> store = new ConcurrentHashMap<>();
    private final AlertRuleConverter alertRuleConverter;

    public MockAlertRuleApplicationService(AlertRuleConverter alertRuleConverter) {
        this.alertRuleConverter = alertRuleConverter;
        seed();
    }

    @Override
    public AlertRuleConverter converter() {
        return alertRuleConverter;
    }

    private void seed() {
        AlertRule sample1 = new AlertRule();
        sample1.setId(IdGenerator.nextId());
        sample1.setRuleCode("RULE_CODE-001");
        sample1.setRuleName("示例数据1");
        sample1.setMetricName("示例数据1");
        sample1.setThresholdValue(new BigDecimal("19.00"));
        sample1.setAlertLevel("warning");
        sample1.setNotifyChannel("email");
        sample1.setEnabled(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        AlertRule sample2 = new AlertRule();
        sample2.setId(IdGenerator.nextId());
        sample2.setRuleCode("RULE_CODE-002");
        sample2.setRuleName("示例数据2");
        sample2.setMetricName("示例数据2");
        sample2.setThresholdValue(new BigDecimal("29.00"));
        sample2.setAlertLevel("warning");
        sample2.setNotifyChannel("email");
        sample2.setEnabled(2);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        AlertRule sample3 = new AlertRule();
        sample3.setId(IdGenerator.nextId());
        sample3.setRuleCode("RULE_CODE-003");
        sample3.setRuleName("示例数据3");
        sample3.setMetricName("示例数据3");
        sample3.setThresholdValue(new BigDecimal("39.00"));
        sample3.setAlertLevel("warning");
        sample3.setNotifyChannel("email");
        sample3.setEnabled(3);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<AlertRule> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public AlertRule getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(AlertRule entity) {
        if (entity.getId() == null) {
            entity.setId(IdGenerator.nextId());
        }
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setDeleted(0);
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean updateById(AlertRule entity) {
        if (entity.getId() == null || !store.containsKey(entity.getId())) {
            return false;
        }
        entity.setUpdatedAt(LocalDateTime.now());
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean removeById(Serializable id) {
        return id != null && store.remove(Long.valueOf(String.valueOf(id))) != null;
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public <E extends IPage<AlertRule>> E page(E page) {
        List<AlertRule> all = list().stream()
                .sorted(Comparator.comparing(AlertRule::getId).reversed())
                .toList();
        long current = page.getCurrent();
        long size = page.getSize();
        int from = (int) Math.max(0L, (current - 1) * size);
        int to = (int) Math.min(all.size(), from + size);
        page.setTotal(all.size());
        page.setRecords(from >= all.size() ? List.of() : all.subList(from, to));
        return page;
    }

    @Override
    public PageResult<AlertRuleDTO> pageDtos(AlertRuleQueryRequest request) {
        IPage<AlertRule> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(alertRuleConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
