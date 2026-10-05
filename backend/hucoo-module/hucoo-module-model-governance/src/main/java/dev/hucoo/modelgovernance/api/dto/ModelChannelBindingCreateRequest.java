package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ModelChannelBindingCreateRequest implements Serializable {
    @NotNull
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "关联的供应商渠道 ID")
    private Long channelId;
    @NotBlank
    @io.swagger.v3.oas.annotations.media.Schema(description = "供应商侧实际模型编码")
    private String providerModelCode;
    @io.swagger.v3.oas.annotations.media.Schema(description = "渠道内可选的模型别名")
    private String modelAlias;
    @io.swagger.v3.oas.annotations.media.Schema(description = "本映射专用的 Endpoint 覆盖地址")
    private String endpointOverride;
    @io.swagger.v3.oas.annotations.media.Schema(description = "渠道对模型能力的覆盖声明 JSON")
    private String capabilityOverrideJson;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "默认路由权重")
    private Integer defaultWeight;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "路由目标优先级，数值越小越优先")
    private Integer priority;
    @PositiveOrZero
    @io.swagger.v3.oas.annotations.media.Schema(description = "该映射允许的最大并发数，0 表示不限制")
    private Integer maxConcurrency;
}
