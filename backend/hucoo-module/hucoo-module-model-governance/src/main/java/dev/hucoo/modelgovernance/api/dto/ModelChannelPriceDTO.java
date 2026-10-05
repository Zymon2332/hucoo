package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelChannelPriceDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "关联的模型渠道映射 ID")
    private Long bindingId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "计费维度：INPUT_TOKEN、OUTPUT_TOKEN、CACHE_READ_TOKEN、CACHE_WRITE_TOKEN、REQUEST")
    private String billingDimension;
    @io.swagger.v3.oas.annotations.media.Schema(description = "价格阶梯起始数量，包含该值")
    private Long tierStart;
    @io.swagger.v3.oas.annotations.media.Schema(description = "价格阶梯结束数量，包含该值，空值表示无上限")
    private Long tierEnd;
    @io.swagger.v3.oas.annotations.media.Schema(description = "单价数值，按 unit_scale 换算")
    private BigDecimal unitPrice;
    @io.swagger.v3.oas.annotations.media.Schema(description = "价格单位缩放因子，默认按百万单位换算")
    private Long unitScale;
    @io.swagger.v3.oas.annotations.media.Schema(description = "价格币种，例如 USD、CNY")
    private String currency;
    @io.swagger.v3.oas.annotations.media.Schema(description = "价格生效时间")
    private LocalDateTime effectiveFrom;
    @io.swagger.v3.oas.annotations.media.Schema(description = "价格失效时间，空值表示当前有效")
    private LocalDateTime effectiveTo;
}
