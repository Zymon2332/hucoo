package dev.hucoo.toolmcp.application.service;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.toolmcp.api.dto.*;
public interface ToolCatalogFacade {
    PageResult<ToolDefinitionDTO> page(String keyword, long page, long size);
    ToolDefinitionDTO get(Long id);
    ToolDefinitionDTO create(ToolDefinitionCreateRequest request);
    ToolDefinitionDTO update(Long id, ToolDefinitionCreateRequest request);
    boolean delete(Long id);
}
