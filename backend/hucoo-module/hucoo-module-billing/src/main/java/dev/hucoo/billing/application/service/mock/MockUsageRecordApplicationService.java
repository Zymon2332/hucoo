package dev.hucoo.billing.application.service.mock;

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

import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.api.dto.UsageRecordQueryRequest;
import dev.hucoo.billing.application.converter.UsageRecordConverter;
import dev.hucoo.billing.application.service.UsageRecordApplicationService;
import dev.hucoo.billing.domain.entity.UsageRecord;
import dev.hucoo.billing.infrastructure.mapper.UsageRecordMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockUsageRecordApplicationService extends ServiceImpl<UsageRecordMapper, UsageRecord>
        implements UsageRecordApplicationService {

    private final Map<Long, UsageRecord> store = new ConcurrentHashMap<>();
    private final UsageRecordConverter usageRecordConverter;

    public MockUsageRecordApplicationService(UsageRecordConverter usageRecordConverter) {
        this.usageRecordConverter = usageRecordConverter;
        seed();
    }

    @Override
    public UsageRecordConverter converter() {
        return usageRecordConverter;
    }

    private void seed() {
        UsageRecord sample1 = new UsageRecord();
        sample1.setId(IdGenerator.nextId());
        sample1.setBillingTenantId(1001L);
        sample1.setUsageType("standard");
        sample1.setModelCode("MODEL_CODE-001");
        sample1.setQuantity(1001L);
        sample1.setUnitPrice(new BigDecimal("19.00"));
        sample1.setAmount(new BigDecimal("19.00"));
        sample1.setPeriod("period-001");
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        UsageRecord sample2 = new UsageRecord();
        sample2.setId(IdGenerator.nextId());
        sample2.setBillingTenantId(2001L);
        sample2.setUsageType("standard");
        sample2.setModelCode("MODEL_CODE-002");
        sample2.setQuantity(2001L);
        sample2.setUnitPrice(new BigDecimal("29.00"));
        sample2.setAmount(new BigDecimal("29.00"));
        sample2.setPeriod("period-002");
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        UsageRecord sample3 = new UsageRecord();
        sample3.setId(IdGenerator.nextId());
        sample3.setBillingTenantId(3001L);
        sample3.setUsageType("standard");
        sample3.setModelCode("MODEL_CODE-003");
        sample3.setQuantity(3001L);
        sample3.setUnitPrice(new BigDecimal("39.00"));
        sample3.setAmount(new BigDecimal("39.00"));
        sample3.setPeriod("period-003");
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<UsageRecord> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public UsageRecord getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(UsageRecord entity) {
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
    public boolean updateById(UsageRecord entity) {
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
    public <E extends IPage<UsageRecord>> E page(E page) {
        List<UsageRecord> all = list().stream()
                .sorted(Comparator.comparing(UsageRecord::getId).reversed())
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
    public PageResult<UsageRecordDTO> pageDtos(UsageRecordQueryRequest request) {
        IPage<UsageRecord> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(usageRecordConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
