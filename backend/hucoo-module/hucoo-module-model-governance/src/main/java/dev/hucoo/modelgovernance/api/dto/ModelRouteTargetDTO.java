package dev.hucoo.modelgovernance.api.dto;

import java.math.BigDecimal;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelRouteTargetDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "所属路由策略 ID")
    private Long routePolicyId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "旧版供应商 ID")
    private Long providerId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标模型编码")
    private String modelCode;
    @io.swagger.v3.oas.annotations.media.Schema(description = "旧版模型密钥 ID")
    private Long modelKeyId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标专用 Endpoint 覆盖地址")
    private String endpointOverride;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标配置权重")
    private Integer configuredWeight;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标最大并发数，0 表示不限制")
    private Integer maxConcurrency;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标优先级，数值越小越优先")
    private Integer priority;
    @io.swagger.v3.oas.annotations.media.Schema(description = "目标状态：ACTIVE、DRAINING、DISABLED、REVOKED")
    private String status;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型渠道映射 ID")
    private Long bindingId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "本路由目标使用的凭证 ID")
    private Long credentialId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "本路由目标的单次成本限制")
    private BigDecimal costLimit;
    @io.swagger.v3.oas.annotations.media.Schema(description = "允许进入路由的最低健康分")
    private BigDecimal healthThreshold;
}
