package dev.hucoo.identity.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.identity.api.dto.RoleCreateRequest;
import dev.hucoo.identity.api.dto.RoleDTO;
import dev.hucoo.identity.api.dto.RoleQueryRequest;

public interface RoleFacade extends ModuleFacade {

    PageResult<RoleDTO> pageDtos(RoleQueryRequest request);

    RoleDTO getDto(Long id);

    RoleDTO create(RoleCreateRequest request);

    RoleDTO update(Long id, RoleCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-identity";
    }
}
