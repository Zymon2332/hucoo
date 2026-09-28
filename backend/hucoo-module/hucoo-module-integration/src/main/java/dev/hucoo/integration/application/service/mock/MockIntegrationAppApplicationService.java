package dev.hucoo.integration.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.api.dto.IntegrationAppQueryRequest;
import dev.hucoo.integration.application.converter.IntegrationAppConverter;
import dev.hucoo.integration.application.service.IntegrationAppApplicationService;
import dev.hucoo.integration.domain.entity.IntegrationApp;
import dev.hucoo.integration.infrastructure.mapper.IntegrationAppMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockIntegrationAppApplicationService extends ServiceImpl<IntegrationAppMapper, IntegrationApp>
        implements IntegrationAppApplicationService {

    private final Map<Long, IntegrationApp> store = new ConcurrentHashMap<>();
    private final IntegrationAppConverter integrationAppConverter;

    public MockIntegrationAppApplicationService(IntegrationAppConverter integrationAppConverter) {
        this.integrationAppConverter = integrationAppConverter;
        seed();
    }

    @Override
    public IntegrationAppConverter converter() {
        return integrationAppConverter;
    }

    private void seed() {
        IntegrationApp sample1 = new IntegrationApp();
        sample1.setId(IdGenerator.nextId());
        sample1.setAppCode("APP_CODE-001");
        sample1.setAppName("示例数据1");
        sample1.setIntegrationType("standard");
        sample1.setWebhookUrl("https://example.agent.io/hook/1");
        sample1.setOauthClientId("oauthClientId-001");
        sample1.setStatus(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        IntegrationApp sample2 = new IntegrationApp();
        sample2.setId(IdGenerator.nextId());
        sample2.setAppCode("APP_CODE-002");
        sample2.setAppName("示例数据2");
        sample2.setIntegrationType("standard");
        sample2.setWebhookUrl("https://example.agent.io/hook/2");
        sample2.setOauthClientId("oauthClientId-002");
        sample2.setStatus(2);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        IntegrationApp sample3 = new IntegrationApp();
        sample3.setId(IdGenerator.nextId());
        sample3.setAppCode("APP_CODE-003");
        sample3.setAppName("示例数据3");
        sample3.setIntegrationType("standard");
        sample3.setWebhookUrl("https://example.agent.io/hook/3");
        sample3.setOauthClientId("oauthClientId-003");
        sample3.setStatus(3);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<IntegrationApp> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public IntegrationApp getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(IntegrationApp entity) {
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
    public boolean updateById(IntegrationApp entity) {
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
    public <E extends IPage<IntegrationApp>> E page(E page) {
        List<IntegrationApp> all = list().stream()
                .sorted(Comparator.comparing(IntegrationApp::getId).reversed())
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
    public PageResult<IntegrationAppDTO> pageDtos(IntegrationAppQueryRequest request) {
        IPage<IntegrationApp> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(integrationAppConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
