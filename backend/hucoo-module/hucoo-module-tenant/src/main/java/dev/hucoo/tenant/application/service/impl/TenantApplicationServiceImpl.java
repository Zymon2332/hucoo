package dev.hucoo.tenant.application.service.impl;

import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.api.dto.TenantQueryRequest;
import dev.hucoo.tenant.api.dto.TenantOverviewDTO;
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

    @Override
    public TenantOverviewDTO overview(Long id) {
        TenantOverviewDTO overview = new TenantOverviewDTO();
        overview.setTenant(getDto(id));
        Map<String, Object> stats = getBaseMapper().selectOverviewStats(id);
        overview.setUserCount(number(stats, "user_count"));
        overview.setOrganizationCount(number(stats, "organization_count"));
        overview.setActiveUserCount(number(stats, "active_user_count"));
        return overview;
    }

    private long number(Map<String, Object> values, String key) {
        Object value = values == null ? null : values.get(key);
        return value instanceof Number number ? number.longValue() : 0L;
    }

}
