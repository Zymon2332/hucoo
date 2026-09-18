package dev.hucoo.tenant.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.HashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.api.dto.TenantQueryRequest;
import dev.hucoo.tenant.application.converter.TenantConverter;
import dev.hucoo.tenant.application.service.TenantApplicationService;
import dev.hucoo.tenant.domain.entity.Tenant;
import dev.hucoo.tenant.infrastructure.mapper.TenantMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockTenantApplicationService extends ServiceImpl<TenantMapper, Tenant>
        implements TenantApplicationService {

    private final Map<Long, Tenant> store = new ConcurrentHashMap<>();
    private final TenantConverter tenantConverter;

    public MockTenantApplicationService(TenantConverter tenantConverter) {
        this.tenantConverter = tenantConverter;
        seed();
    }

    @Override
    public TenantConverter converter() {
        return tenantConverter;
    }

    private void seed() {
        Tenant sample1 = new Tenant();
        sample1.setId(IdGenerator.nextId());
        sample1.setTenantCode("TENANT_CODE-001");
        sample1.setTenantName("示例数据1");
        sample1.setContactEmail("demo1@agent.io");
        sample1.setPlanCode("PLAN_CODE-001");
        sample1.setStatus(1);
        sample1.setExpireAt(LocalDateTime.now().minusDays(1));
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        Tenant sample2 = new Tenant();
        sample2.setId(IdGenerator.nextId());
        sample2.setTenantCode("TENANT_CODE-002");
        sample2.setTenantName("示例数据2");
        sample2.setContactEmail("demo2@agent.io");
        sample2.setPlanCode("PLAN_CODE-002");
        sample2.setStatus(2);
        sample2.setExpireAt(LocalDateTime.now().minusDays(2));
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        Tenant sample3 = new Tenant();
        sample3.setId(IdGenerator.nextId());
        sample3.setTenantCode("TENANT_CODE-003");
        sample3.setTenantName("示例数据3");
        sample3.setContactEmail("demo3@agent.io");
        sample3.setPlanCode("PLAN_CODE-003");
        sample3.setStatus(3);
        sample3.setExpireAt(LocalDateTime.now().minusDays(3));
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<Tenant> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public Tenant getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(Tenant entity) {
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
    public boolean updateById(Tenant entity) {
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
    public <E extends IPage<Tenant>> E page(E page) {
        List<Tenant> all = list().stream()
                .sorted(Comparator.comparing(Tenant::getId).reversed())
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
    public PageResult<TenantDTO> pageDtos(TenantQueryRequest request) {
        IPage<Tenant> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(tenantConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public Map<String, Object> statistics() {
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("total", store.size());
        statistics.put("mock", Boolean.TRUE);
        return statistics;
    }

}
