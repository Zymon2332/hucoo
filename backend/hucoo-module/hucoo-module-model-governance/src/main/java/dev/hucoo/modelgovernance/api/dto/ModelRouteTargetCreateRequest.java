package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import java.math.BigDecimal;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ModelRouteTargetCreateRequest implements Serializable {
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标配置权重")
    private Integer configuredWeight;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标最大并发数，0 表示不限制")
    private Integer maxConcurrency;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标优先级，数值越小越优先")
    private Integer priority;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标状态：ACTIVE、DRAINING、DISABLED、REVOKED")
    private String status;
    @NotNull
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型渠道映射 ID")
    private Long bindingId;
    @NotNull
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "本路由目标使用的凭证 ID")
    private Long credentialId;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "本路由目标的单次成本限制")
    private BigDecimal costLimit;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "允许进入路由的最低健康分")
    private BigDecimal healthThreshold;
}
