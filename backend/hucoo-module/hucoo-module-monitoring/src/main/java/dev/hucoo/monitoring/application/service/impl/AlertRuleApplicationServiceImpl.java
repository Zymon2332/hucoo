package dev.hucoo.monitoring.application.service.impl;

import java.math.BigDecimal;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.api.dto.AlertRuleQueryRequest;
import dev.hucoo.monitoring.application.converter.AlertRuleConverter;
import dev.hucoo.monitoring.application.service.AlertRuleApplicationService;
import dev.hucoo.monitoring.domain.entity.AlertRule;
import dev.hucoo.monitoring.infrastructure.mapper.AlertRuleMapper;
import dev.hucoo.monitoring.infrastructure.repository.AlertRuleRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class AlertRuleApplicationServiceImpl extends ServiceImpl<AlertRuleMapper, AlertRule>
        implements AlertRuleApplicationService {

    private final AlertRuleRepository alertRuleRepository;
    private final AlertRuleConverter alertRuleConverter;

    public AlertRuleApplicationServiceImpl(AlertRuleRepository alertRuleRepository,
                                          AlertRuleConverter alertRuleConverter) {
        this.alertRuleRepository = alertRuleRepository;
        this.alertRuleConverter = alertRuleConverter;
    }

    @Override
    public AlertRuleConverter converter() {
        return alertRuleConverter;
    }

    @Override
    public PageResult<AlertRuleDTO> pageDtos(AlertRuleQueryRequest request) {
        IPage<AlertRule> page = alertRuleRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(alertRuleConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
