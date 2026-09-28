package dev.hucoo.agent.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.agent.api.dto.AgentTemplateCreateRequest;
import dev.hucoo.agent.api.dto.AgentTemplateDTO;
import dev.hucoo.agent.api.dto.AgentTemplateQueryRequest;

public interface AgentTemplateFacade extends ModuleFacade {

    PageResult<AgentTemplateDTO> pageDtos(AgentTemplateQueryRequest request);

    AgentTemplateDTO getDto(Long id);

    AgentTemplateDTO create(AgentTemplateCreateRequest request);

    AgentTemplateDTO update(Long id, AgentTemplateCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-agent";
    }
}
