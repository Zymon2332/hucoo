package dev.hucoo.security.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.api.dto.SecurityPolicyQueryRequest;
import dev.hucoo.security.application.converter.SecurityPolicyConverter;
import dev.hucoo.security.application.service.SecurityPolicyApplicationService;
import dev.hucoo.security.domain.entity.SecurityPolicy;
import dev.hucoo.security.infrastructure.mapper.SecurityPolicyMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockSecurityPolicyApplicationService extends ServiceImpl<SecurityPolicyMapper, SecurityPolicy>
        implements SecurityPolicyApplicationService {

    private final Map<Long, SecurityPolicy> store = new ConcurrentHashMap<>();
    private final SecurityPolicyConverter securityPolicyConverter;

    public MockSecurityPolicyApplicationService(SecurityPolicyConverter securityPolicyConverter) {
        this.securityPolicyConverter = securityPolicyConverter;
        seed();
    }

    @Override
    public SecurityPolicyConverter converter() {
        return securityPolicyConverter;
    }

    private void seed() {
        SecurityPolicy sample1 = new SecurityPolicy();
        sample1.setId(IdGenerator.nextId());
        sample1.setPolicyCode("POLICY_CODE-001");
        sample1.setPolicyName("示例数据1");
        sample1.setPolicyType("standard");
        sample1.setPolicyContent("policyContent-001");
        sample1.setEnabled(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        SecurityPolicy sample2 = new SecurityPolicy();
        sample2.setId(IdGenerator.nextId());
        sample2.setPolicyCode("POLICY_CODE-002");
        sample2.setPolicyName("示例数据2");
        sample2.setPolicyType("standard");
        sample2.setPolicyContent("policyContent-002");
        sample2.setEnabled(2);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        SecurityPolicy sample3 = new SecurityPolicy();
        sample3.setId(IdGenerator.nextId());
        sample3.setPolicyCode("POLICY_CODE-003");
        sample3.setPolicyName("示例数据3");
        sample3.setPolicyType("standard");
        sample3.setPolicyContent("policyContent-003");
        sample3.setEnabled(3);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<SecurityPolicy> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public SecurityPolicy getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(SecurityPolicy entity) {
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
    public boolean updateById(SecurityPolicy entity) {
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
    public <E extends IPage<SecurityPolicy>> E page(E page) {
        List<SecurityPolicy> all = list().stream()
                .sorted(Comparator.comparing(SecurityPolicy::getId).reversed())
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
    public PageResult<SecurityPolicyDTO> pageDtos(SecurityPolicyQueryRequest request) {
        IPage<SecurityPolicy> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(securityPolicyConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
