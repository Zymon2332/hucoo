package dev.hucoo.tenant.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.tenant.domain.entity.Tenant;
import dev.hucoo.tenant.infrastructure.mapper.TenantMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class TenantRepositoryImpl implements TenantRepository {

    private final TenantMapper tenantMapper;

    public TenantRepositoryImpl(TenantMapper tenantMapper) {
        this.tenantMapper = tenantMapper;
    }

    @Override
    public Optional<Tenant> findById(Long id) {
        return Optional.ofNullable(tenantMapper.selectById(id));
    }

    @Override
    public List<Tenant> listAll() {
        return tenantMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(Tenant entity) {
        return tenantMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(Tenant entity) {
        return tenantMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return tenantMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<Tenant> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<Tenant> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(Tenant::getTenantCode, keyword);
        }
        wrapper.orderByDesc(Tenant::getTenantCode);
        return tenantMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return tenantMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
