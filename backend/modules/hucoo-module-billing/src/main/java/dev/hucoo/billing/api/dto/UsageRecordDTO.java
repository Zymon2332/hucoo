package dev.hucoo.billing.api.dto;

import java.math.BigDecimal;
import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UsageRecordDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private Long billingTenantId;
    private String usageType;
    private String modelCode;
    private Long quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private String period;
}
