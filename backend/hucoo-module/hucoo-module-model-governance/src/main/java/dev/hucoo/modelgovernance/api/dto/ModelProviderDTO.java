package dev.hucoo.modelgovernance.api.dto;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelProviderDTO extends BaseDTO {
    private String providerCode;
    private String providerName;
    private String endpoint;
    private String providerType;
    private String website;
    private String documentationUrl;
    private String defaultRegion;
    private String complianceLevel;
    private String description;
    private String approvalStatus;
    private Integer status;
}
