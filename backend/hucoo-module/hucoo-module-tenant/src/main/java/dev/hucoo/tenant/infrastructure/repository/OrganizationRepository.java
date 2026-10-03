package dev.hucoo.tenant.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.tenant.domain.entity.Organization;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface OrganizationRepository {

    Optional<Organization> findById(Long id);

    List<Organization> listAll();

    boolean save(Organization entity);

    boolean updateById(Organization entity);

    boolean removeById(Long id);

    IPage<Organization> page(long pageNum, long pageSize, String keyword);

    long count();
}
