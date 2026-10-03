package dev.hucoo.tenant.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.tenant.api.dto.OrganizationDTO;
import dev.hucoo.tenant.api.dto.OrganizationQueryRequest;
import dev.hucoo.tenant.application.converter.OrganizationConverter;
import dev.hucoo.tenant.application.service.OrganizationApplicationService;
import dev.hucoo.tenant.domain.entity.Organization;
import dev.hucoo.tenant.infrastructure.mapper.OrganizationMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockOrganizationApplicationService extends ServiceImpl<OrganizationMapper, Organization>
        implements OrganizationApplicationService {

    private final Map<Long, Organization> store = new ConcurrentHashMap<>();
    private final OrganizationConverter organizationConverter;

    public MockOrganizationApplicationService(OrganizationConverter organizationConverter) {
        this.organizationConverter = organizationConverter;
        seed();
    }

    @Override
    public OrganizationConverter converter() {
        return organizationConverter;
    }

    private void seed() {
        Organization sample1 = new Organization();
        sample1.setId(IdGenerator.nextId());
        sample1.setOrgCode("ORG_CODE-001");
        sample1.setOrgName("示例组织1");
        sample1.setOrgType("department");
        sample1.setStatus(1);
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        Organization sample2 = new Organization();
        sample2.setId(IdGenerator.nextId());
        sample2.setOrgCode("ORG_CODE-002");
        sample2.setOrgName("示例组织2");
        sample2.setOrgType("team");
        sample2.setStatus(2);
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        Organization sample3 = new Organization();
        sample3.setId(IdGenerator.nextId());
        sample3.setOrgCode("ORG_CODE-003");
        sample3.setOrgName("示例组织3");
        sample3.setOrgType("team");
        sample3.setStatus(3);
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<Organization> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public Organization getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(Organization entity) {
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
    public boolean updateById(Organization entity) {
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
    public <E extends IPage<Organization>> E page(E page) {
        List<Organization> all = list().stream()
                .sorted(Comparator.comparing(Organization::getId).reversed())
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
    public PageResult<OrganizationDTO> pageDtos(OrganizationQueryRequest request) {
        IPage<Organization> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(organizationConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
