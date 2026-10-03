package dev.hucoo.admin.platformconfig.application;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockPlatformConfigFacade implements PlatformConfigFacade {
    public Map<String, Object> getGroup(String group) { return Map.of("group", group, "items", Map.of()); }
    public Map<String, Object> license() { return Map.of("status", "ACTIVE", "licenseKeyRef", "vault://license/current"); }
    public Map<String, Object> nodes() { return Map.of("nodes", java.util.List.of()); }
    public void update(String group, String key, Map<String, Object> value) { }
    public void restore(String group, String key) { }
}
