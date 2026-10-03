package dev.hucoo.tenant.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.tenant.api.dto.OrganizationDTO;
import dev.hucoo.tenant.api.dto.OrganizationQueryRequest;
import dev.hucoo.tenant.application.converter.OrganizationConverter;
import dev.hucoo.tenant.application.service.OrganizationApplicationService;
import dev.hucoo.tenant.domain.entity.Organization;
import dev.hucoo.tenant.infrastructure.mapper.OrganizationMapper;
import dev.hucoo.tenant.infrastructure.repository.OrganizationRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class OrganizationApplicationServiceImpl extends ServiceImpl<OrganizationMapper, Organization>
        implements OrganizationApplicationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationConverter organizationConverter;

    public OrganizationApplicationServiceImpl(OrganizationRepository organizationRepository,
                                          OrganizationConverter organizationConverter) {
        this.organizationRepository = organizationRepository;
        this.organizationConverter = organizationConverter;
    }

    @Override
    public OrganizationConverter converter() {
        return organizationConverter;
    }

    @Override
    public PageResult<OrganizationDTO> pageDtos(OrganizationQueryRequest request) {
        IPage<Organization> page = organizationRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(organizationConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
