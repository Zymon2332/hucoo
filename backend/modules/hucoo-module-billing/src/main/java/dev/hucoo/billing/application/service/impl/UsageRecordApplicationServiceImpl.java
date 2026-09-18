package dev.hucoo.billing.application.service.impl;

import java.math.BigDecimal;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.api.dto.UsageRecordQueryRequest;
import dev.hucoo.billing.application.converter.UsageRecordConverter;
import dev.hucoo.billing.application.service.UsageRecordApplicationService;
import dev.hucoo.billing.domain.entity.UsageRecord;
import dev.hucoo.billing.infrastructure.mapper.UsageRecordMapper;
import dev.hucoo.billing.infrastructure.repository.UsageRecordRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class UsageRecordApplicationServiceImpl extends ServiceImpl<UsageRecordMapper, UsageRecord>
        implements UsageRecordApplicationService {

    private final UsageRecordRepository usageRecordRepository;
    private final UsageRecordConverter usageRecordConverter;

    public UsageRecordApplicationServiceImpl(UsageRecordRepository usageRecordRepository,
                                          UsageRecordConverter usageRecordConverter) {
        this.usageRecordRepository = usageRecordRepository;
        this.usageRecordConverter = usageRecordConverter;
    }

    @Override
    public UsageRecordConverter converter() {
        return usageRecordConverter;
    }

    @Override
    public PageResult<UsageRecordDTO> pageDtos(UsageRecordQueryRequest request) {
        IPage<UsageRecord> page = usageRecordRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(usageRecordConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
