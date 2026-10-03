package dev.hucoo.admin.domain;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockDomainCatalogService implements DomainCatalogFacade {
    public PageResult<Map<String, Object>> page(String r,String k,long p,long s){return PageResult.empty(p,s);}
    public Map<String,Object> get(String r,Long id){throw new ResourceNotFoundException(r,id);}
    public Map<String,Object> create(String r,Map<String,Object> v){return v == null ? Map.of() : v;}
    public Map<String,Object> update(String r,Long id,Map<String,Object> v){return v == null ? Map.of() : v;}
    public boolean delete(String r,Long id,Integer v){return true;}
    public Map<String,Object> action(String r,Long id,String a,Map<String,Object> v){return Map.of("id",id,"action",a,"status","ACCEPTED");}
}
