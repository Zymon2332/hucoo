package dev.hucoo.toolmcp.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationQueryRequest;
import dev.hucoo.toolmcp.application.converter.McpServerRegistrationConverter;
import dev.hucoo.toolmcp.application.service.McpServerRegistrationApplicationService;
import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;
import dev.hucoo.toolmcp.infrastructure.mapper.McpServerRegistrationMapper;
import dev.hucoo.toolmcp.infrastructure.repository.McpServerRegistrationRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class McpServerRegistrationApplicationServiceImpl extends ServiceImpl<McpServerRegistrationMapper, McpServerRegistration>
        implements McpServerRegistrationApplicationService {

    private final McpServerRegistrationRepository mcpServerRegistrationRepository;
    private final McpServerRegistrationConverter mcpServerRegistrationConverter;

    public McpServerRegistrationApplicationServiceImpl(McpServerRegistrationRepository mcpServerRegistrationRepository,
                                          McpServerRegistrationConverter mcpServerRegistrationConverter) {
        this.mcpServerRegistrationRepository = mcpServerRegistrationRepository;
        this.mcpServerRegistrationConverter = mcpServerRegistrationConverter;
    }

    @Override
    public McpServerRegistrationConverter converter() {
        return mcpServerRegistrationConverter;
    }

    @Override
    public PageResult<McpServerRegistrationDTO> pageDtos(McpServerRegistrationQueryRequest request) {
        IPage<McpServerRegistration> page = mcpServerRegistrationRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(mcpServerRegistrationConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
