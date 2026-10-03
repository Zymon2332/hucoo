package dev.hucoo.monitoring.application.service;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
@Service
@ConditionalOnProperty(prefix="agent-platform.persistence", name="enabled", havingValue="false", matchIfMissing=true)
public class MockAlertStateService implements AlertStateFacade { public Map<String,Object> transition(Long id,String action){return Map.of("alertId",id,"status",action.toUpperCase());} }
