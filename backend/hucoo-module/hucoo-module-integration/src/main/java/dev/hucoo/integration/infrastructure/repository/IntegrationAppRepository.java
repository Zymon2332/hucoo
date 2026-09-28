package dev.hucoo.integration.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.integration.domain.entity.IntegrationApp;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface IntegrationAppRepository {

    Optional<IntegrationApp> findById(Long id);

    List<IntegrationApp> listAll();

    boolean save(IntegrationApp entity);

    boolean updateById(IntegrationApp entity);

    boolean removeById(Long id);

    IPage<IntegrationApp> page(long pageNum, long pageSize, String keyword);

    long count();
}
