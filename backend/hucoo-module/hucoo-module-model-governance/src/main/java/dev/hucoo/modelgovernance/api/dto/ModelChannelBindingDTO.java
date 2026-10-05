package dev.hucoo.modelgovernance.api.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelChannelBindingDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "关联的平台模型版本 ID")
    private Long modelVersionId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "关联的供应商渠道 ID")
    private Long channelId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "供应商侧实际模型编码")
    private String providerModelCode;
    @io.swagger.v3.oas.annotations.media.Schema(description = "渠道内可选的模型别名")
    private String modelAlias;
    @io.swagger.v3.oas.annotations.media.Schema(description = "本映射专用的 Endpoint 覆盖地址")
    private String endpointOverride;
    @io.swagger.v3.oas.annotations.media.Schema(description = "渠道对模型能力的覆盖声明 JSON")
    private String capabilityOverrideJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "默认路由权重")
    private Integer defaultWeight;
    @io.swagger.v3.oas.annotations.media.Schema(description = "路由目标优先级，数值越小越优先")
    private Integer priority;
    @io.swagger.v3.oas.annotations.media.Schema(description = "该映射允许的最大并发数，0 表示不限制")
    private Integer maxConcurrency;
    @io.swagger.v3.oas.annotations.media.Schema(description = "映射运行状态：ACTIVE、DRAINING、DISABLED、REVOKED")
    private String status;
    @io.swagger.v3.oas.annotations.media.Schema(description = "映射审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED")
    private String approvalStatus;
    @io.swagger.v3.oas.annotations.media.Schema(description = "最近一次模型验证任务 ID")
    private Long lastValidationRunId;
}
