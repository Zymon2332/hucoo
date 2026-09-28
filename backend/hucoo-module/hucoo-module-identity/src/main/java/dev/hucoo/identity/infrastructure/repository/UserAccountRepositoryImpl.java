package dev.hucoo.identity.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.identity.domain.entity.UserAccount;
import dev.hucoo.identity.infrastructure.mapper.UserAccountMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class UserAccountRepositoryImpl implements UserAccountRepository {

    private final UserAccountMapper userAccountMapper;

    public UserAccountRepositoryImpl(UserAccountMapper userAccountMapper) {
        this.userAccountMapper = userAccountMapper;
    }

    @Override
    public Optional<UserAccount> findById(Long id) {
        return Optional.ofNullable(userAccountMapper.selectById(id));
    }

    @Override
    public List<UserAccount> listAll() {
        return userAccountMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(UserAccount entity) {
        return userAccountMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(UserAccount entity) {
        return userAccountMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return userAccountMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<UserAccount> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<UserAccount> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(UserAccount::getRoleCode, keyword);
        }
        wrapper.orderByDesc(UserAccount::getRoleCode);
        return userAccountMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return userAccountMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
