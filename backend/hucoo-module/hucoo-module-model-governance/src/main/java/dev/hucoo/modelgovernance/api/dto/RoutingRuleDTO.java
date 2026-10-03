package dev.hucoo.modelgovernance.api.dto;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RoutingRuleDTO extends BaseDTO {
    private String ruleName;
    private String primaryModel;
    private String fallbackModel;
    private Integer priority;
    private String fallbackCondition;
    private String costOwner;
    private Integer status;
}
