package dev.hucoo.modelgovernance.api.dto;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class CustomModelRegistrationDTO extends BaseDTO {
    private String modelCode;
    private Long providerId;
    private String visibility;
    private String approvalStatus;
    private String endpoint;
    private String keyRef;
    private String keyFingerprint;
    private Integer status;
}
