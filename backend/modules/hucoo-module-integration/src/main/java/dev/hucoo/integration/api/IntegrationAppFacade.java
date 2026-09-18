package dev.hucoo.integration.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.integration.api.dto.IntegrationAppCreateRequest;
import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.api.dto.IntegrationAppQueryRequest;

public interface IntegrationAppFacade extends ModuleFacade {

    PageResult<IntegrationAppDTO> pageDtos(IntegrationAppQueryRequest request);

    IntegrationAppDTO getDto(Long id);

    IntegrationAppDTO create(IntegrationAppCreateRequest request);

    IntegrationAppDTO update(Long id, IntegrationAppCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-integration";
    }
}
