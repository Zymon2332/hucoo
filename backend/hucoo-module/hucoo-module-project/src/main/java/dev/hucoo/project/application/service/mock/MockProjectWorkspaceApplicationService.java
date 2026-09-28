package dev.hucoo.project.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.api.dto.ProjectWorkspaceQueryRequest;
import dev.hucoo.project.application.converter.ProjectWorkspaceConverter;
import dev.hucoo.project.application.service.ProjectWorkspaceApplicationService;
import dev.hucoo.project.domain.entity.ProjectWorkspace;
import dev.hucoo.project.infrastructure.mapper.ProjectWorkspaceMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockProjectWorkspaceApplicationService extends ServiceImpl<ProjectWorkspaceMapper, ProjectWorkspace>
        implements ProjectWorkspaceApplicationService {

    private final Map<Long, ProjectWorkspace> store = new ConcurrentHashMap<>();
    private final ProjectWorkspaceConverter projectWorkspaceConverter;

    public MockProjectWorkspaceApplicationService(ProjectWorkspaceConverter projectWorkspaceConverter) {
        this.projectWorkspaceConverter = projectWorkspaceConverter;
        seed();
    }

    @Override
    public ProjectWorkspaceConverter converter() {
        return projectWorkspaceConverter;
    }

    private void seed() {
        ProjectWorkspace sample1 = new ProjectWorkspace();
        sample1.setId(IdGenerator.nextId());
        sample1.setProjectCode("PROJECT_CODE-001");
        sample1.setProjectName("示例数据1");
        sample1.setOwnerId(1001L);
        sample1.setWorkspacePolicy("workspacePolicy-001");
        sample1.setRepositoryUrl("https://example.agent.io/hook/1");
        sample1.setStatus(1);
        sample1.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample1.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample1.setDeleted(0);
        store.put(sample1.getId(), sample1);

        ProjectWorkspace sample2 = new ProjectWorkspace();
        sample2.setId(IdGenerator.nextId());
        sample2.setProjectCode("PROJECT_CODE-002");
        sample2.setProjectName("示例数据2");
        sample2.setOwnerId(2001L);
        sample2.setWorkspacePolicy("workspacePolicy-002");
        sample2.setRepositoryUrl("https://example.agent.io/hook/2");
        sample2.setStatus(2);
        sample2.setCreatedAt(LocalDateTime.now().minusDays(2));
        sample2.setUpdatedAt(LocalDateTime.now().minusDays(2));
        sample2.setDeleted(0);
        store.put(sample2.getId(), sample2);

        ProjectWorkspace sample3 = new ProjectWorkspace();
        sample3.setId(IdGenerator.nextId());
        sample3.setProjectCode("PROJECT_CODE-003");
        sample3.setProjectName("示例数据3");
        sample3.setOwnerId(3001L);
        sample3.setWorkspacePolicy("workspacePolicy-003");
        sample3.setRepositoryUrl("https://example.agent.io/hook/3");
        sample3.setStatus(3);
        sample3.setCreatedAt(LocalDateTime.now().minusDays(3));
        sample3.setUpdatedAt(LocalDateTime.now().minusDays(3));
        sample3.setDeleted(0);
        store.put(sample3.getId(), sample3);

    }

    @Override
    public List<ProjectWorkspace> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public ProjectWorkspace getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(ProjectWorkspace entity) {
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
    public boolean updateById(ProjectWorkspace entity) {
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
    public <E extends IPage<ProjectWorkspace>> E page(E page) {
        List<ProjectWorkspace> all = list().stream()
                .sorted(Comparator.comparing(ProjectWorkspace::getId).reversed())
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
    public PageResult<ProjectWorkspaceDTO> pageDtos(ProjectWorkspaceQueryRequest request) {
        IPage<ProjectWorkspace> page = page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(projectWorkspaceConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
