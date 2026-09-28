package dev.hucoo.toolmcp.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationCreateRequest;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationDTO;
import dev.hucoo.toolmcp.api.dto.McpServerRegistrationQueryRequest;

public interface McpServerRegistrationFacade extends ModuleFacade {

    PageResult<McpServerRegistrationDTO> pageDtos(McpServerRegistrationQueryRequest request);

    McpServerRegistrationDTO getDto(Long id);

    McpServerRegistrationDTO create(McpServerRegistrationCreateRequest request);

    McpServerRegistrationDTO update(Long id, McpServerRegistrationCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "module-toolmcp";
    }
}
