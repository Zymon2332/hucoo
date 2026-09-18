package dev.hucoo.modelgovernance.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import dev.hucoo.modelgovernance.infrastructure.mapper.ModelDefinitionMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class ModelDefinitionRepositoryImpl implements ModelDefinitionRepository {

    private final ModelDefinitionMapper modelDefinitionMapper;

    public ModelDefinitionRepositoryImpl(ModelDefinitionMapper modelDefinitionMapper) {
        this.modelDefinitionMapper = modelDefinitionMapper;
    }

    @Override
    public Optional<ModelDefinition> findById(Long id) {
        return Optional.ofNullable(modelDefinitionMapper.selectById(id));
    }

    @Override
    public List<ModelDefinition> listAll() {
        return modelDefinitionMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(ModelDefinition entity) {
        return modelDefinitionMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(ModelDefinition entity) {
        return modelDefinitionMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return modelDefinitionMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<ModelDefinition> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<ModelDefinition> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(ModelDefinition::getModelCode, keyword);
        }
        wrapper.orderByDesc(ModelDefinition::getModelCode);
        return modelDefinitionMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return modelDefinitionMapper.selectCount(new LambdaQueryWrapper<>());
    }
}
