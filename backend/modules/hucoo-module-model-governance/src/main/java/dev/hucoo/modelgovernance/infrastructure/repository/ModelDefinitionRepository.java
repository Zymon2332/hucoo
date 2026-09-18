package dev.hucoo.modelgovernance.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface ModelDefinitionRepository {

    Optional<ModelDefinition> findById(Long id);

    List<ModelDefinition> listAll();

    boolean save(ModelDefinition entity);

    boolean updateById(ModelDefinition entity);

    boolean removeById(Long id);

    IPage<ModelDefinition> page(long pageNum, long pageSize, String keyword);

    long count();
}
