package dev.hucoo.billing.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class UsageRecordCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
@JsonSerialize(using = ToStringSerializer.class)
    @NotNull(message = "billingTenantId 不能为空")
    private Long billingTenantId;

    @NotBlank(message = "usageType 不能为空")
    private String usageType;

    @NotBlank(message = "modelCode 不能为空")
    private String modelCode;

    private Long quantity;

    @NotNull(message = "unitPrice 不能为空")
    private BigDecimal unitPrice;

    private BigDecimal amount;

    private String period;

}
