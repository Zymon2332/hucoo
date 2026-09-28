package dev.hucoo.tenant.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.tenant.domain.entity.Tenant;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface TenantRepository {

    Optional<Tenant> findById(Long id);

    List<Tenant> listAll();

    boolean save(Tenant entity);

    boolean updateById(Tenant entity);

    boolean removeById(Long id);

    IPage<Tenant> page(long pageNum, long pageSize, String keyword);

    long count();
}
