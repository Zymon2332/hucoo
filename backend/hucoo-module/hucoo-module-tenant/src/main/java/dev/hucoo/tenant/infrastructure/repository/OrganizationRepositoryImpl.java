package dev.hucoo.tenant.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.tenant.domain.entity.Organization;
import dev.hucoo.tenant.infrastructure.mapper.OrganizationMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class OrganizationRepositoryImpl implements OrganizationRepository {

    private final OrganizationMapper organizationMapper;

    public OrganizationRepositoryImpl(OrganizationMapper organizationMapper) {
        this.organizationMapper = organizationMapper;
    }

    @Override
    public Optional<Organization> findById(Long id) {
        return Optional.ofNullable(organizationMapper.selectById(id));
    }

    @Override
    public List<Organization> listAll() {
        return organizationMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(Organization entity) {
        return organizationMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(Organization entity) {
        return organizationMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return organizationMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<Organization> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<Organization> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(Organization::getOrgCode, keyword);
        }
        wrapper.orderByDesc(Organization::getOrgCode);
        return organizationMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return organizationMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
