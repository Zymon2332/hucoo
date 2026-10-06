package dev.hucoo.common.api;

import java.util.List;

import dev.hucoo.common.api.dto.SystemConfigDTO;

/**
 * Reads effective configuration in the trusted current tenant context.
 */
public interface SystemConfigFacade {
    SystemConfigDTO effective(String key);

    List<SystemConfigDTO> effectiveGroup(String group);
}
