package dev.hucoo.toolmcp.application.service;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.toolmcp.api.dto.*;
@Service
@ConditionalOnProperty(prefix="agent-platform.persistence", name="enabled", havingValue="false", matchIfMissing=true)
public class MockToolCatalogService implements ToolCatalogFacade {
    public PageResult<ToolDefinitionDTO> page(String k,long p,long s){return PageResult.empty(p,s);}
    public ToolDefinitionDTO get(Long id){throw new ResourceNotFoundException("ToolDefinition",id);}
    public ToolDefinitionDTO create(ToolDefinitionCreateRequest r){return new ToolDefinitionDTO();}
    public ToolDefinitionDTO update(Long id,ToolDefinitionCreateRequest r){return create(r);}
    public boolean delete(Long id){return true;}
}
