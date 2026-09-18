package dev.hucoo.security.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.api.dto.SecurityPolicyQueryRequest;
import dev.hucoo.security.application.converter.SecurityPolicyConverter;
import dev.hucoo.security.application.service.SecurityPolicyApplicationService;
import dev.hucoo.security.domain.entity.SecurityPolicy;
import dev.hucoo.security.infrastructure.mapper.SecurityPolicyMapper;
import dev.hucoo.security.infrastructure.repository.SecurityPolicyRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class SecurityPolicyApplicationServiceImpl extends ServiceImpl<SecurityPolicyMapper, SecurityPolicy>
        implements SecurityPolicyApplicationService {

    private final SecurityPolicyRepository securityPolicyRepository;
    private final SecurityPolicyConverter securityPolicyConverter;

    public SecurityPolicyApplicationServiceImpl(SecurityPolicyRepository securityPolicyRepository,
                                          SecurityPolicyConverter securityPolicyConverter) {
        this.securityPolicyRepository = securityPolicyRepository;
        this.securityPolicyConverter = securityPolicyConverter;
    }

    @Override
    public SecurityPolicyConverter converter() {
        return securityPolicyConverter;
    }

    @Override
    public PageResult<SecurityPolicyDTO> pageDtos(SecurityPolicyQueryRequest request) {
        IPage<SecurityPolicy> page = securityPolicyRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(securityPolicyConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
