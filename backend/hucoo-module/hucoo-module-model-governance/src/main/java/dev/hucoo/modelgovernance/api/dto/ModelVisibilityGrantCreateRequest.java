package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelVisibilityGrantCreateRequest implements Serializable {
    @NotBlank
    private String scopeType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "范围对象 ID，平台范围使用空字符串")
    private String scopeId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "授权效果：ALLOW 或 DENY，DENY 优先")
    private String effect = "ALLOW";
    @io.swagger.v3.oas.annotations.media.Schema(description = "授权生效时间")
    private LocalDateTime validFrom;
    @io.swagger.v3.oas.annotations.media.Schema(description = "授权失效时间")
    private LocalDateTime validTo;
}
