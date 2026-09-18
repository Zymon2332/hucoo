package dev.hucoo.monitoring.api.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AlertRuleCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "ruleCode 不能为空")
    private String ruleCode;

    @NotBlank(message = "ruleName 不能为空")
    private String ruleName;

    @NotBlank(message = "metricName 不能为空")
    private String metricName;

    @NotNull(message = "thresholdValue 不能为空")
    private BigDecimal thresholdValue;

    private String alertLevel;

    private String notifyChannel;

    private Integer enabled;

}
