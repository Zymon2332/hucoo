package dev.hucoo.monitoring.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.monitoring.domain.entity.AlertRule;
import dev.hucoo.monitoring.infrastructure.mapper.AlertRuleMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class AlertRuleRepositoryImpl implements AlertRuleRepository {

    private final AlertRuleMapper alertRuleMapper;

    public AlertRuleRepositoryImpl(AlertRuleMapper alertRuleMapper) {
        this.alertRuleMapper = alertRuleMapper;
    }

    @Override
    public Optional<AlertRule> findById(Long id) {
        return Optional.ofNullable(alertRuleMapper.selectById(id));
    }

    @Override
    public List<AlertRule> listAll() {
        return alertRuleMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(AlertRule entity) {
        return alertRuleMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(AlertRule entity) {
        return alertRuleMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return alertRuleMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<AlertRule> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<AlertRule> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(AlertRule::getRuleCode, keyword);
        }
        wrapper.orderByDesc(AlertRule::getRuleCode);
        return alertRuleMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return alertRuleMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
