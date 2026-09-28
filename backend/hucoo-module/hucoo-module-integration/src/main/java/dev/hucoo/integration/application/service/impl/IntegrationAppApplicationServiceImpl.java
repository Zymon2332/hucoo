package dev.hucoo.integration.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.api.dto.IntegrationAppQueryRequest;
import dev.hucoo.integration.application.converter.IntegrationAppConverter;
import dev.hucoo.integration.application.service.IntegrationAppApplicationService;
import dev.hucoo.integration.domain.entity.IntegrationApp;
import dev.hucoo.integration.infrastructure.mapper.IntegrationAppMapper;
import dev.hucoo.integration.infrastructure.repository.IntegrationAppRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class IntegrationAppApplicationServiceImpl extends ServiceImpl<IntegrationAppMapper, IntegrationApp>
        implements IntegrationAppApplicationService {

    private final IntegrationAppRepository integrationAppRepository;
    private final IntegrationAppConverter integrationAppConverter;

    public IntegrationAppApplicationServiceImpl(IntegrationAppRepository integrationAppRepository,
                                          IntegrationAppConverter integrationAppConverter) {
        this.integrationAppRepository = integrationAppRepository;
        this.integrationAppConverter = integrationAppConverter;
    }

    @Override
    public IntegrationAppConverter converter() {
        return integrationAppConverter;
    }

    @Override
    public PageResult<IntegrationAppDTO> pageDtos(IntegrationAppQueryRequest request) {
        IPage<IntegrationApp> page = integrationAppRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(integrationAppConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
