package dev.hucoo.billing.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.billing.domain.entity.UsageRecord;
import dev.hucoo.billing.infrastructure.mapper.UsageRecordMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class UsageRecordRepositoryImpl implements UsageRecordRepository {

    private final UsageRecordMapper usageRecordMapper;

    public UsageRecordRepositoryImpl(UsageRecordMapper usageRecordMapper) {
        this.usageRecordMapper = usageRecordMapper;
    }

    @Override
    public Optional<UsageRecord> findById(Long id) {
        return Optional.ofNullable(usageRecordMapper.selectById(id));
    }

    @Override
    public List<UsageRecord> listAll() {
        return usageRecordMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(UsageRecord entity) {
        return usageRecordMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(UsageRecord entity) {
        return usageRecordMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return usageRecordMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<UsageRecord> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<UsageRecord> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(UsageRecord::getModelCode, keyword);
        }
        wrapper.orderByDesc(UsageRecord::getModelCode);
        return usageRecordMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return usageRecordMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
