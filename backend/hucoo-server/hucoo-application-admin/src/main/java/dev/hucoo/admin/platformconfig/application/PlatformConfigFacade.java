package dev.hucoo.admin.platformconfig.application;

import java.util.Map;

public interface PlatformConfigFacade {
    Map<String, Object> getGroup(String group);
    Map<String, Object> license();
    Map<String, Object> nodes();
    void update(String group, String key, Map<String, Object> value);
    void restore(String group, String key);
}
