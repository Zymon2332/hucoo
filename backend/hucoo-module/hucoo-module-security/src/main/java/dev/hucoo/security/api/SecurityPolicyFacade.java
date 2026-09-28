package dev.hucoo.security.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.security.api.dto.SecurityPolicyCreateRequest;
import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.api.dto.SecurityPolicyQueryRequest;

public interface SecurityPolicyFacade extends ModuleFacade {

    PageResult<SecurityPolicyDTO> pageDtos(SecurityPolicyQueryRequest request);

    SecurityPolicyDTO getDto(Long id);

    SecurityPolicyDTO create(SecurityPolicyCreateRequest request);

    SecurityPolicyDTO update(Long id, SecurityPolicyCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-security";
    }
}
