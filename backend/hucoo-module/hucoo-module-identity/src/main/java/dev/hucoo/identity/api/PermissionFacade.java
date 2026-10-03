package dev.hucoo.identity.api;

import java.util.List;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.identity.api.dto.PermissionCreateRequest;
import dev.hucoo.identity.api.dto.PermissionDTO;
import dev.hucoo.identity.api.dto.PermissionMatrixRowDTO;
import dev.hucoo.identity.api.dto.PermissionQueryRequest;

public interface PermissionFacade extends ModuleFacade {

    PageResult<PermissionDTO> pageDtos(PermissionQueryRequest request);

    PermissionDTO getDto(Long id);

    PermissionDTO create(PermissionCreateRequest request);

    PermissionDTO update(Long id, PermissionCreateRequest request);

    boolean remove(Long id);

    List<PermissionMatrixRowDTO> matrix(Long roleId);

    boolean setRolePermission(Long roleId, Long permissionId, boolean granted);

    @Override
    default String moduleName() {
        return "hucoo-module-identity";
    }
}
