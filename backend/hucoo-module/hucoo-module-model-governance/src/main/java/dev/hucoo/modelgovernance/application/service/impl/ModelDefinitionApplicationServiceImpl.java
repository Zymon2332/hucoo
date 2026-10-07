package dev.hucoo.modelgovernance.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.application.converter.ModelDefinitionConverter;
import dev.hucoo.modelgovernance.application.service.ModelDefinitionApplicationService;
import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import dev.hucoo.modelgovernance.infrastructure.mapper.ModelDefinitionMapper;
import dev.hucoo.modelgovernance.infrastructure.repository.ModelDefinitionRepository;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class ModelDefinitionApplicationServiceImpl extends ServiceImpl<ModelDefinitionMapper, ModelDefinition>
        implements ModelDefinitionApplicationService {

    private final ModelDefinitionRepository modelDefinitionRepository;
    private final ModelDefinitionConverter modelDefinitionConverter;

    public ModelDefinitionApplicationServiceImpl(ModelDefinitionRepository modelDefinitionRepository,
                                                 ModelDefinitionConverter modelDefinitionConverter) {
        this.modelDefinitionRepository = modelDefinitionRepository;
        this.modelDefinitionConverter = modelDefinitionConverter;
    }

    @Override
    public ModelDefinitionConverter converter() {
        return modelDefinitionConverter;
    }

    @Override
    public PageResult<ModelDefinitionDTO> pageDtos(ModelDefinitionQueryRequest request) {
        IPage<ModelDefinition> page = modelDefinitionRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(modelDefinitionConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

}
