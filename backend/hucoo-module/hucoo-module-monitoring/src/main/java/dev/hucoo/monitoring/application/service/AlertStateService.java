package dev.hucoo.monitoring.application.service;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
@Service
@ConditionalOnProperty(prefix="agent-platform.persistence", name="enabled", havingValue="true")
public class AlertStateService implements AlertStateFacade {
 private final JdbcTemplate jdbc;
 public AlertStateService(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public Map<String,Object> transition(Long id,String action){
  String status=switch(action){case "acknowledge"->"ACKNOWLEDGED";case "resolve"->"RESOLVED";default->throw new IllegalArgumentException("Unsupported alert action: "+action);};
  int changed=jdbc.update("UPDATE ap_alert SET status=?, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=? AND deleted=0",status,id,CurrentTenantContext.getTenantId());
  if(changed==0)throw new ResourceNotFoundException("Alert",id);
  return jdbc.queryForMap("SELECT * FROM ap_alert WHERE id=? AND tenant_id=? AND deleted=0",id,CurrentTenantContext.getTenantId());
 }
}
