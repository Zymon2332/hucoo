package dev.hucoo.identity.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.identity.api.dto.ApprovalActionRequest;
import dev.hucoo.identity.api.dto.ApprovalDTO;
import dev.hucoo.identity.api.dto.ApprovalQueryRequest;

public interface ApprovalFacade extends ModuleFacade {

    PageResult<ApprovalDTO> pageDtos(ApprovalQueryRequest request);

    ApprovalDTO getDto(Long id);

    ApprovalDTO approve(Long id, ApprovalActionRequest request);

    ApprovalDTO reject(Long id, ApprovalActionRequest request);

    ApprovalDTO withdraw(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-identity";
    }
}
