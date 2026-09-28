package dev.hucoo.modelgovernance.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.application.converter.ModelDefinitionConverter;
import dev.hucoo.modelgovernance.application.service.ModelDefinitionApplicationService;
import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import dev.hucoo.modelgovernance.infrastructure.mapper.ModelDefinitionMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockModelDefinitionApplicationService extends ServiceImpl<ModelDefinitionMapper, ModelDefinition>
        implements ModelDefinitionApplicationService {

    private final Map<Long, ModelDefinition> store = new ConcurrentHashMap<>();
    private final ModelDefinitionConverter modelDefinitionConverter;

    public MockModelDefinitionApplicationService(ModelDefinitionConverter modelDefinitionConverter) {
        this.modelDefinitionConverter = modelDefinitionConverter;
        seed();
    }

    @Override
    public ModelDefinitionConverter converter() {
        return modelDefinitionConverter;
    }

    private void seed() {
        ModelDefinition sample1 = new ModelDefinition();
        sample1.setId(IdGenerator.nextId());
        sample1.setModelCode("MODEL_CODE-001");
        sample1.setModelName("示例数据1");
        sample1.setProvider("provider-001");
        sample1.setModelType("standard");
        sample1.setEndpoint("endpoint-001");
        sample1.setStatus(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        ModelDefinition sample2 = new ModelDefinition();
        sample2.setId(IdGenerator.nextId());
        sample2.setModelCode("MODEL_CODE-002");
        sample2.setModelName("示例数据2");
        sample2.setProvider("provider-002");
        sample2.setModelType("standard");
        sample2.setEndpoint("endpoint-002");
        sample2.setStatus(2);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        ModelDefinition sample3 = new ModelDefinition();
        sample3.setId(IdGenerator.nextId());
        sample3.setModelCode("MODEL_CODE-003");
        sample3.setModelName("示例数据3");
        sample3.setProvider("provider-003");
        sample3.setModelType("standard");
        sample3.setEndpoint("endpoint-003");
        sample3.setStatus(3);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<ModelDefinition> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public ModelDefinition getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(ModelDefinition entity) {
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
    public boolean updateById(ModelDefinition entity) {
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
    public <E extends IPage<ModelDefinition>> E page(E page) {
        List<ModelDefinition> all = list().stream()
                .sorted(Comparator.comparing(ModelDefinition::getId).reversed())
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
    public PageResult<ModelDefinitionDTO> pageDtos(ModelDefinitionQueryRequest request) {
        IPage<ModelDefinition> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(modelDefinitionConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
