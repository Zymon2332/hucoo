package dev.hucoo.modelgovernance.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;

public interface ModelDefinitionFacade extends ModuleFacade {

    PageResult<ModelDefinitionDTO> pageDtos(ModelDefinitionQueryRequest request);

    ModelDefinitionDTO getDto(Long id);

    ModelDefinitionDTO create(ModelDefinitionCreateRequest request);

    ModelDefinitionDTO update(Long id, ModelDefinitionCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "module-modelgovernance";
    }
}
