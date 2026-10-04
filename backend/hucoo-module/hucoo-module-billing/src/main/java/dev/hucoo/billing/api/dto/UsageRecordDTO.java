package dev.hucoo.billing.api.dto;

import java.math.BigDecimal;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import dev.hucoo.commons.dto.BaseDTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UsageRecordDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long billingTenantId;
    private String usageType;
    private String modelCode;
    private Long quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private String period;
}
