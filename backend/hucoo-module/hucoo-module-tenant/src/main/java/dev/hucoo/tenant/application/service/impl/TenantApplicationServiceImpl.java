package dev.hucoo.tenant.application.service.impl;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.api.dto.TenantQueryRequest;
import dev.hucoo.tenant.application.converter.TenantConverter;
import dev.hucoo.tenant.application.service.TenantApplicationService;
import dev.hucoo.tenant.domain.entity.Tenant;
import dev.hucoo.tenant.infrastructure.mapper.TenantMapper;
import dev.hucoo.tenant.infrastructure.repository.TenantRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class TenantApplicationServiceImpl extends ServiceImpl<TenantMapper, Tenant>
        implements TenantApplicationService {

    private final TenantRepository tenantRepository;
    private final TenantConverter tenantConverter;

    public TenantApplicationServiceImpl(TenantRepository tenantRepository,
                                          TenantConverter tenantConverter) {
        this.tenantRepository = tenantRepository;
        this.tenantConverter = tenantConverter;
    }

    @Override
    public TenantConverter converter() {
        return tenantConverter;
    }

    @Override
    public PageResult<TenantDTO> pageDtos(TenantQueryRequest request) {
        IPage<Tenant> page = tenantRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(tenantConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public Map<String, Object> statistics() {
        return getBaseMapper().selectStatistics();
    }

}
