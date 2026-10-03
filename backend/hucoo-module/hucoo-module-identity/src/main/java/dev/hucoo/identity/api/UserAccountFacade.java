package dev.hucoo.identity.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.identity.api.dto.UserAccountCreateRequest;
import dev.hucoo.identity.api.dto.UserAccountDTO;
import dev.hucoo.identity.api.dto.UserAccountQueryRequest;
import dev.hucoo.identity.api.dto.UserAccountOverviewDTO;

public interface UserAccountFacade extends ModuleFacade {

    PageResult<UserAccountDTO> pageDtos(UserAccountQueryRequest request);

    UserAccountDTO getDto(Long id);

    UserAccountOverviewDTO overview(Long id);

    UserAccountDTO create(UserAccountCreateRequest request);

    UserAccountDTO update(Long id, UserAccountCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-identity";
    }
}
