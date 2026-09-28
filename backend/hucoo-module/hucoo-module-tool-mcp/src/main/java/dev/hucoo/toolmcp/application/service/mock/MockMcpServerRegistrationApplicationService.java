package dev.hucoo.toolmcp.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationQueryRequest;
import dev.hucoo.toolmcp.application.converter.McpServerRegistrationConverter;
import dev.hucoo.toolmcp.application.service.McpServerRegistrationApplicationService;
import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;
import dev.hucoo.toolmcp.infrastructure.mapper.McpServerRegistrationMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockMcpServerRegistrationApplicationService extends ServiceImpl<McpServerRegistrationMapper, McpServerRegistration>
        implements McpServerRegistrationApplicationService {

    private final Map<Long, McpServerRegistration> store = new ConcurrentHashMap<>();
    private final McpServerRegistrationConverter mcpServerRegistrationConverter;

    public MockMcpServerRegistrationApplicationService(McpServerRegistrationConverter mcpServerRegistrationConverter) {
        this.mcpServerRegistrationConverter = mcpServerRegistrationConverter;
        seed();
    }

    @Override
    public McpServerRegistrationConverter converter() {
        return mcpServerRegistrationConverter;
    }

    private void seed() {
        McpServerRegistration sample1 = new McpServerRegistration();
        sample1.setId(IdGenerator.nextId());
        sample1.setServerCode("SERVER_CODE-001");
        sample1.setServerName("示例数据1");
        sample1.setEndpoint("endpoint-001");
        sample1.setTransport("transport-001");
        sample1.setReviewStatus(1);
        sample1.setNetworkPolicy("networkPolicy-001");
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        McpServerRegistration sample2 = new McpServerRegistration();
        sample2.setId(IdGenerator.nextId());
        sample2.setServerCode("SERVER_CODE-002");
        sample2.setServerName("示例数据2");
        sample2.setEndpoint("endpoint-002");
        sample2.setTransport("transport-002");
        sample2.setReviewStatus(1);
        sample2.setNetworkPolicy("networkPolicy-002");
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        McpServerRegistration sample3 = new McpServerRegistration();
        sample3.setId(IdGenerator.nextId());
        sample3.setServerCode("SERVER_CODE-003");
        sample3.setServerName("示例数据3");
        sample3.setEndpoint("endpoint-003");
        sample3.setTransport("transport-003");
        sample3.setReviewStatus(1);
        sample3.setNetworkPolicy("networkPolicy-003");
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<McpServerRegistration> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public McpServerRegistration getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(McpServerRegistration entity) {
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
    public boolean updateById(McpServerRegistration entity) {
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
    public <E extends IPage<McpServerRegistration>> E page(E page) {
        List<McpServerRegistration> all = list().stream()
                .sorted(Comparator.comparing(McpServerRegistration::getId).reversed())
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
    public PageResult<McpServerRegistrationDTO> pageDtos(McpServerRegistrationQueryRequest request) {
        IPage<McpServerRegistration> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(mcpServerRegistrationConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
