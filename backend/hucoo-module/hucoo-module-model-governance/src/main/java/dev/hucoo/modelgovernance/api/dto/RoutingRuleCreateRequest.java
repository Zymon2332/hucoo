package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoutingRuleCreateRequest implements Serializable {
    @NotBlank
    private String ruleName;
    @NotBlank
    private String primaryModel;
    private String fallbackModel;
    private Integer priority;
    private String fallbackCondition;
    private String costOwner;
    private Integer status;
}
