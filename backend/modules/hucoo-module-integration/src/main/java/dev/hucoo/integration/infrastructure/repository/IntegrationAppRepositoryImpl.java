package dev.hucoo.integration.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.integration.domain.entity.IntegrationApp;
import dev.hucoo.integration.infrastructure.mapper.IntegrationAppMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class IntegrationAppRepositoryImpl implements IntegrationAppRepository {

    private final IntegrationAppMapper integrationAppMapper;

    public IntegrationAppRepositoryImpl(IntegrationAppMapper integrationAppMapper) {
        this.integrationAppMapper = integrationAppMapper;
    }

    @Override
    public Optional<IntegrationApp> findById(Long id) {
        return Optional.ofNullable(integrationAppMapper.selectById(id));
    }

    @Override
    public List<IntegrationApp> listAll() {
        return integrationAppMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(IntegrationApp entity) {
        return integrationAppMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(IntegrationApp entity) {
        return integrationAppMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return integrationAppMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<IntegrationApp> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<IntegrationApp> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(IntegrationApp::getAppCode, keyword);
        }
        wrapper.orderByDesc(IntegrationApp::getAppCode);
        return integrationAppMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return integrationAppMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
