package dev.hucoo.security.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.security.domain.entity.SecurityPolicy;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface SecurityPolicyRepository {

    Optional<SecurityPolicy> findById(Long id);

    List<SecurityPolicy> listAll();

    boolean save(SecurityPolicy entity);

    boolean updateById(SecurityPolicy entity);

    boolean removeById(Long id);

    IPage<SecurityPolicy> page(long pageNum, long pageSize, String keyword);

    long count();
}
