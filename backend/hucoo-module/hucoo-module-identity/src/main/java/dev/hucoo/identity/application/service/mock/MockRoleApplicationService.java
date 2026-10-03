package dev.hucoo.identity.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.identity.api.dto.RoleDTO;
import dev.hucoo.identity.api.dto.RoleQueryRequest;
import dev.hucoo.identity.application.converter.RoleConverter;
import dev.hucoo.identity.application.service.RoleApplicationService;
import dev.hucoo.identity.domain.entity.Role;
import dev.hucoo.identity.infrastructure.mapper.RoleMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockRoleApplicationService extends ServiceImpl<RoleMapper, Role>
        implements RoleApplicationService {

    private final Map<Long, Role> store = new ConcurrentHashMap<>();
    private final RoleConverter roleConverter;

    public MockRoleApplicationService(RoleConverter roleConverter) {
        this.roleConverter = roleConverter;
        seed();
    }

    @Override
    public RoleConverter converter() {
        return roleConverter;
    }

    private void seed() {
        saveSeed("platform-admin", "平台管理员", "PLATFORM", 100);
        saveSeed("tenant-admin", "租户管理员", "TENANT", 50);
        saveSeed("auditor", "安全审计员", "TENANT", 30);
    }

    private void saveSeed(String code, String name, String scope, int level) {
        Role role = new Role();
        role.setId(IdGenerator.nextId());
        role.setRoleCode(code);
        role.setRoleName(name);
        role.setScope(scope);
        role.setRoleLevel(level);
        role.setSystem(1);
        role.setStatus(1);
        role.setCreatedAt(LocalDateTime.now());
        role.setUpdatedAt(LocalDateTime.now());
        role.setDeleted(0);
        store.put(role.getId(), role);
    }

    @Override
    public Role getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(Role entity) {
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
    public boolean updateById(Role entity) {
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
    public <E extends IPage<Role>> E page(E page) {
        List<Role> all = new ArrayList<>(store.values()).stream()
                .sorted(Comparator.comparing(Role::getId).reversed())
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
    public PageResult<RoleDTO> pageDtos(RoleQueryRequest request) {
        IPage<Role> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(roleConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }
}
