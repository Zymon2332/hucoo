package dev.hucoo.agent.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.api.dto.AgentTemplateQueryRequest;
import dev.hucoo.agent.application.converter.AgentTemplateConverter;
import dev.hucoo.agent.application.service.AgentTemplateApplicationService;
import dev.hucoo.agent.domain.entity.AgentTemplate;
import dev.hucoo.agent.infrastructure.mapper.AgentTemplateMapper;
import dev.hucoo.agent.infrastructure.repository.AgentTemplateRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class AgentTemplateApplicationServiceImpl extends ServiceImpl<AgentTemplateMapper, AgentTemplate>
        implements AgentTemplateApplicationService {

    private final AgentTemplateRepository agentTemplateRepository;
    private final AgentTemplateConverter agentTemplateConverter;

    public AgentTemplateApplicationServiceImpl(AgentTemplateRepository agentTemplateRepository,
                                          AgentTemplateConverter agentTemplateConverter) {
        this.agentTemplateRepository = agentTemplateRepository;
        this.agentTemplateConverter = agentTemplateConverter;
    }

    @Override
    public AgentTemplateConverter converter() {
        return agentTemplateConverter;
    }

    @Override
    public PageResult<AgentTemplateDTO> pageDtos(AgentTemplateQueryRequest request) {
        IPage<AgentTemplate> page = agentTemplateRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(agentTemplateConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
