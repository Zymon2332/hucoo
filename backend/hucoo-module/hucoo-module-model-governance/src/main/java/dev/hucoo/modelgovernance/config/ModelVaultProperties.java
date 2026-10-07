package dev.hucoo.modelgovernance.config;

import java.util.HashMap;
import java.util.Map;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "agent-platform.model-governance.vault")
public class ModelVaultProperties {
    private String keyId = "model-master";
    private String activeVersion = "v1";
    @lombok.ToString.Exclude
    private Map<String, String> keys = new HashMap<>();
}
