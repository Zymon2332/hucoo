package dev.hucoo.security.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.security.domain.entity.SecurityPolicy;
import dev.hucoo.security.infrastructure.mapper.SecurityPolicyMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class SecurityPolicyRepositoryImpl implements SecurityPolicyRepository {

    private final SecurityPolicyMapper securityPolicyMapper;

    public SecurityPolicyRepositoryImpl(SecurityPolicyMapper securityPolicyMapper) {
        this.securityPolicyMapper = securityPolicyMapper;
    }

    @Override
    public Optional<SecurityPolicy> findById(Long id) {
        return Optional.ofNullable(securityPolicyMapper.selectById(id));
    }

    @Override
    public List<SecurityPolicy> listAll() {
        return securityPolicyMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(SecurityPolicy entity) {
        return securityPolicyMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(SecurityPolicy entity) {
        return securityPolicyMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return securityPolicyMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<SecurityPolicy> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<SecurityPolicy> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(SecurityPolicy::getPolicyCode, keyword);
        }
        wrapper.orderByDesc(SecurityPolicy::getPolicyCode);
        return securityPolicyMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return securityPolicyMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
