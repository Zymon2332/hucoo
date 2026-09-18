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

import dev.hucoo.identity.api.dto.UserAccountDTO;
import dev.hucoo.identity.api.dto.UserAccountQueryRequest;
import dev.hucoo.identity.application.converter.UserAccountConverter;
import dev.hucoo.identity.application.service.UserAccountApplicationService;
import dev.hucoo.identity.domain.entity.UserAccount;
import dev.hucoo.identity.infrastructure.mapper.UserAccountMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockUserAccountApplicationService extends ServiceImpl<UserAccountMapper, UserAccount>
        implements UserAccountApplicationService {

    private final Map<Long, UserAccount> store = new ConcurrentHashMap<>();
    private final UserAccountConverter userAccountConverter;

    public MockUserAccountApplicationService(UserAccountConverter userAccountConverter) {
        this.userAccountConverter = userAccountConverter;
        seed();
    }

    @Override
    public UserAccountConverter converter() {
        return userAccountConverter;
    }

    private void seed() {
        UserAccount sample1 = new UserAccount();
        sample1.setId(IdGenerator.nextId());
        sample1.setUsername("username-001");
        sample1.setDisplayName("示例数据1");
        sample1.setEmail("email-001");
        sample1.setPhone("phone-001");
        sample1.setRoleCode("ROLE_CODE-001");
        sample1.setStatus(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        UserAccount sample2 = new UserAccount();
        sample2.setId(IdGenerator.nextId());
        sample2.setUsername("username-002");
        sample2.setDisplayName("示例数据2");
        sample2.setEmail("email-002");
        sample2.setPhone("phone-002");
        sample2.setRoleCode("ROLE_CODE-002");
        sample2.setStatus(2);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        UserAccount sample3 = new UserAccount();
        sample3.setId(IdGenerator.nextId());
        sample3.setUsername("username-003");
        sample3.setDisplayName("示例数据3");
        sample3.setEmail("email-003");
        sample3.setPhone("phone-003");
        sample3.setRoleCode("ROLE_CODE-003");
        sample3.setStatus(3);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<UserAccount> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public UserAccount getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(UserAccount entity) {
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
    public boolean updateById(UserAccount entity) {
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
    public <E extends IPage<UserAccount>> E page(E page) {
        List<UserAccount> all = list().stream()
                .sorted(Comparator.comparing(UserAccount::getId).reversed())
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
    public PageResult<UserAccountDTO> pageDtos(UserAccountQueryRequest request) {
        IPage<UserAccount> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(userAccountConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
