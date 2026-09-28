package dev.hucoo.agent.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.agent.domain.entity.AgentTemplate;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface AgentTemplateRepository {

    Optional<AgentTemplate> findById(Long id);

    List<AgentTemplate> listAll();

    boolean save(AgentTemplate entity);

    boolean updateById(AgentTemplate entity);

    boolean removeById(Long id);

    IPage<AgentTemplate> page(long pageNum, long pageSize, String keyword);

    long count();
}
