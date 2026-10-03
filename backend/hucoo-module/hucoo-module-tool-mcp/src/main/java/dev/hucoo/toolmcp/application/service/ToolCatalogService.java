package dev.hucoo.toolmcp.application.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.toolmcp.api.dto.*;
import dev.hucoo.toolmcp.domain.entity.ToolDefinition;
import dev.hucoo.toolmcp.infrastructure.mapper.ToolDefinitionMapper;

@Service
@ConditionalOnProperty(prefix="agent-platform.persistence", name="enabled", havingValue="true")
public class ToolCatalogService implements ToolCatalogFacade {
    private final ToolDefinitionMapper mapper;
    public ToolCatalogService(ToolDefinitionMapper mapper){this.mapper=mapper;}
    public PageResult<ToolDefinitionDTO> page(String keyword,long page,long size){
        LambdaQueryWrapper<ToolDefinition> w=new LambdaQueryWrapper<>();
        if(StringUtil.isNotBlank(keyword)) w.like(ToolDefinition::getToolCode,keyword).or().like(ToolDefinition::getToolName,keyword);
        IPage<ToolDefinition> p=mapper.selectPage(new Page<>(page,size),w.orderByDesc(ToolDefinition::getId));
        return PageResult.of(p.getRecords().stream().map(this::dto).toList(),p.getTotal(),p.getCurrent(),p.getSize());
    }
    public ToolDefinitionDTO get(Long id){ToolDefinition e=mapper.selectById(id);if(e==null)throw new ResourceNotFoundException("ToolDefinition",id);return dto(e);}
    public ToolDefinitionDTO create(ToolDefinitionCreateRequest r){ToolDefinition e=new ToolDefinition();apply(e,r);mapper.insert(e);return dto(e);}
    public ToolDefinitionDTO update(Long id,ToolDefinitionCreateRequest r){ToolDefinition e=mapper.selectById(id);if(e==null)throw new ResourceNotFoundException("ToolDefinition",id);apply(e,r);mapper.updateById(e);return dto(e);}
    public boolean delete(Long id){if(mapper.selectById(id)==null)throw new ResourceNotFoundException("ToolDefinition",id);return mapper.deleteById(id)>0;}
    private void apply(ToolDefinition e,ToolDefinitionCreateRequest r){e.setToolCode(r.getToolCode());e.setToolName(r.getToolName());e.setParameterSchema(r.getParameterSchema());e.setRiskLevel(r.getRiskLevel());e.setRequiresApproval(r.getRequiresApproval()==null?0:r.getRequiresApproval());e.setStatus(r.getStatus()==null?1:r.getStatus());}
    private ToolDefinitionDTO dto(ToolDefinition e){ToolDefinitionDTO d=new ToolDefinitionDTO();d.setId(e.getId());d.setToolCode(e.getToolCode());d.setToolName(e.getToolName());d.setParameterSchema(e.getParameterSchema());d.setRiskLevel(e.getRiskLevel());d.setRequiresApproval(e.getRequiresApproval());d.setStatus(e.getStatus());d.setCreatedAt(e.getCreatedAt());d.setUpdatedAt(e.getUpdatedAt());return d;}
}
