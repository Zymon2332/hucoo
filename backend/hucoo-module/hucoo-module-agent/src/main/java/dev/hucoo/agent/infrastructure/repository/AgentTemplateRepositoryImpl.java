package dev.hucoo.agent.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.agent.domain.entity.AgentTemplate;
import dev.hucoo.agent.infrastructure.mapper.AgentTemplateMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class AgentTemplateRepositoryImpl implements AgentTemplateRepository {

    private final AgentTemplateMapper agentTemplateMapper;

    public AgentTemplateRepositoryImpl(AgentTemplateMapper agentTemplateMapper) {
        this.agentTemplateMapper = agentTemplateMapper;
    }

    @Override
    public Optional<AgentTemplate> findById(Long id) {
        return Optional.ofNullable(agentTemplateMapper.selectById(id));
    }

    @Override
    public List<AgentTemplate> listAll() {
        return agentTemplateMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(AgentTemplate entity) {
        return agentTemplateMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(AgentTemplate entity) {
        return agentTemplateMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return agentTemplateMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<AgentTemplate> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<AgentTemplate> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(AgentTemplate::getAgentCode, keyword);
        }
        wrapper.orderByDesc(AgentTemplate::getAgentCode);
        return agentTemplateMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return agentTemplateMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
