package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelVisibilityGrantDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "关联的逻辑模型 ID")
    private Long modelId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "范围类型：PLATFORM、TENANT、PROJECT、USER")
    private String scopeType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "范围对象 ID，平台范围使用空字符串")
    private String scopeId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "授权效果：ALLOW 或 DENY，DENY 优先")
    private String effect;
    @io.swagger.v3.oas.annotations.media.Schema(description = "授权生效时间")
    private LocalDateTime validFrom;
    @io.swagger.v3.oas.annotations.media.Schema(description = "授权失效时间")
    private LocalDateTime validTo;
}
