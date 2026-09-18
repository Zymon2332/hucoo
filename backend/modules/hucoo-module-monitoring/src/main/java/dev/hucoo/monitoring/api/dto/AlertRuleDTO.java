package dev.hucoo.monitoring.api.dto;

import java.math.BigDecimal;
import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AlertRuleDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String ruleCode;
    private String ruleName;
    private String metricName;
    private BigDecimal thresholdValue;
    private String alertLevel;
    private String notifyChannel;
    private Integer enabled;
}
