package dev.hucoo.security.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class SecurityPolicyDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String policyCode;
    private String policyName;
    private String policyType;
    private String policyContent;
    private Integer enabled;
}
