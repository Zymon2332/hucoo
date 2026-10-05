package dev.hucoo.modelgovernance.api.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class LogicalModelDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "平台内部稳定模型编码")
    private String modelCode;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型展示名称")
    private String modelName;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型系列，例如 GPT、DeepSeek 或 Embedding 系列")
    private String modelFamily;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型类型：CHAT、EMBEDDING、RERANK、IMAGE、AUDIO 等")
    private String modelType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型来源：PLATFORM、CUSTOM、LOCAL、ENTERPRISE")
    private String sourceType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型生命周期：DRAFT、VALIDATING、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED")
    private String lifecycleStatus;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型业务说明")
    private String description;
    @io.swagger.v3.oas.annotations.media.Schema(description = "模型扩展元数据 JSON，不得保存凭证明文")
    private String metadataJson;
    @io.swagger.v3.oas.annotations.media.Schema(description = "用户私有模型的拥有者用户 ID")
    private Long ownerUserId;
}
