package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelProviderCreateRequest implements Serializable {
    @NotBlank private String providerCode;
    @NotBlank private String providerName;
    private String endpoint;
    private String providerType = "OFFICIAL";
    private String website;
    private String documentationUrl;
    private String defaultRegion;
    private String complianceLevel;
    private String description;
    private Integer status;
}
