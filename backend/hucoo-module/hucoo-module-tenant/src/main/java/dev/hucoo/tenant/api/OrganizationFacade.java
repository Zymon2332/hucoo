package dev.hucoo.tenant.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.tenant.api.dto.OrganizationCreateRequest;
import dev.hucoo.tenant.api.dto.OrganizationDTO;
import dev.hucoo.tenant.api.dto.OrganizationQueryRequest;

public interface OrganizationFacade extends ModuleFacade {

    PageResult<OrganizationDTO> pageDtos(OrganizationQueryRequest request);

    OrganizationDTO getDto(Long id);

    OrganizationDTO create(OrganizationCreateRequest request);

    OrganizationDTO update(Long id, OrganizationCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-organization";
    }
}
