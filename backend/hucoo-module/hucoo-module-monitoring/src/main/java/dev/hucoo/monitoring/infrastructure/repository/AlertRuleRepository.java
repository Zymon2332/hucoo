package dev.hucoo.monitoring.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.monitoring.domain.entity.AlertRule;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface AlertRuleRepository {

    Optional<AlertRule> findById(Long id);

    List<AlertRule> listAll();

    boolean save(AlertRule entity);

    boolean updateById(AlertRule entity);

    boolean removeById(Long id);

    IPage<AlertRule> page(long pageNum, long pageSize, String keyword);

    long count();
}
