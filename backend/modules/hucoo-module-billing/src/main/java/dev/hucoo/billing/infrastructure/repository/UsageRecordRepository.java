package dev.hucoo.billing.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.billing.domain.entity.UsageRecord;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface UsageRecordRepository {

    Optional<UsageRecord> findById(Long id);

    List<UsageRecord> listAll();

    boolean save(UsageRecord entity);

    boolean updateById(UsageRecord entity);

    boolean removeById(Long id);

    IPage<UsageRecord> page(long pageNum, long pageSize, String keyword);

    long count();
}
