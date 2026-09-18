package dev.hucoo.identity.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.identity.domain.entity.UserAccount;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface UserAccountRepository {

    Optional<UserAccount> findById(Long id);

    List<UserAccount> listAll();

    boolean save(UserAccount entity);

    boolean updateById(UserAccount entity);

    boolean removeById(Long id);

    IPage<UserAccount> page(long pageNum, long pageSize, String keyword);

    long count();
}
