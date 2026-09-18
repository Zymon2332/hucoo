package dev.hucoo.security.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class SecurityPolicyCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "policyCode 不能为空")
    private String policyCode;

    @NotBlank(message = "policyName 不能为空")
    private String policyName;

    @NotBlank(message = "policyType 不能为空")
    private String policyType;

    private String policyContent;

    private Integer enabled;

}
