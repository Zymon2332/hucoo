package dev.hucoo.tenant.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.tenant.api.dto.TenantCreateRequest;
import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.api.dto.TenantQueryRequest;

public interface TenantFacade extends ModuleFacade {

    PageResult<TenantDTO> pageDtos(TenantQueryRequest request);

    TenantDTO getDto(Long id);

    TenantDTO create(TenantCreateRequest request);

    TenantDTO update(Long id, TenantCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-tenant";
    }
}
