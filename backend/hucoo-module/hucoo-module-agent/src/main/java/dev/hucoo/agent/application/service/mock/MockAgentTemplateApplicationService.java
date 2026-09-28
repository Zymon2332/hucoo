package dev.hucoo.agent.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.api.dto.AgentTemplateQueryRequest;
import dev.hucoo.agent.application.converter.AgentTemplateConverter;
import dev.hucoo.agent.application.service.AgentTemplateApplicationService;
import dev.hucoo.agent.domain.entity.AgentTemplate;
import dev.hucoo.agent.infrastructure.mapper.AgentTemplateMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockAgentTemplateApplicationService extends ServiceImpl<AgentTemplateMapper, AgentTemplate>
        implements AgentTemplateApplicationService {

    private final Map<Long, AgentTemplate> store = new ConcurrentHashMap<>();
    private final AgentTemplateConverter agentTemplateConverter;

    public MockAgentTemplateApplicationService(AgentTemplateConverter agentTemplateConverter) {
        this.agentTemplateConverter = agentTemplateConverter;
        seed();
    }

    @Override
    public AgentTemplateConverter converter() {
        return agentTemplateConverter;
    }

    private void seed() {
        AgentTemplate sample1 = new AgentTemplate();
        sample1.setId(IdGenerator.nextId());
        sample1.setAgentCode("AGENT_CODE-001");
        sample1.setAgentName("示例数据1");
        sample1.setCategory("category-001");
        sample1.setDescription("description-001");
        sample1.setLatestVersion("latestVersion-001");
        sample1.setReviewStatus(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        AgentTemplate sample2 = new AgentTemplate();
        sample2.setId(IdGenerator.nextId());
        sample2.setAgentCode("AGENT_CODE-002");
        sample2.setAgentName("示例数据2");
        sample2.setCategory("category-002");
        sample2.setDescription("description-002");
        sample2.setLatestVersion("latestVersion-002");
        sample2.setReviewStatus(1);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        AgentTemplate sample3 = new AgentTemplate();
        sample3.setId(IdGenerator.nextId());
        sample3.setAgentCode("AGENT_CODE-003");
        sample3.setAgentName("示例数据3");
        sample3.setCategory("category-003");
        sample3.setDescription("description-003");
        sample3.setLatestVersion("latestVersion-003");
        sample3.setReviewStatus(1);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<AgentTemplate> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public AgentTemplate getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(AgentTemplate entity) {
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
    public boolean updateById(AgentTemplate entity) {
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
    public <E extends IPage<AgentTemplate>> E page(E page) {
        List<AgentTemplate> all = list().stream()
                .sorted(Comparator.comparing(AgentTemplate::getId).reversed())
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
    public PageResult<AgentTemplateDTO> pageDtos(AgentTemplateQueryRequest request) {
        IPage<AgentTemplate> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(agentTemplateConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
