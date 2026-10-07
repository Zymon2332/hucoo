package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelCredentialDTO extends BaseDTO {
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证所属供应商渠道 ID")
    private Long channelId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证展示名称")
    private String credentialName;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证类型：API_KEY、OAUTH2、MTLS、NONE")
    private String credentialType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证指纹，用于去重和审计，不可还原明文")
    private String secretFingerprint;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证脱敏展示值，例如 ****abcd")
    private String maskedValue;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证所有权范围：PLATFORM、TENANT、PROJECT、USER")
    private String ownerScopeType;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证所有权范围对象 ID")
    private String ownerScopeId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证状态：ACTIVE、EXPIRED、ROTATING、REVOKED、DISABLED")
    private String status;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证过期时间")
    private LocalDateTime expiresAt;
    @io.swagger.v3.oas.annotations.media.Schema(description = "最近一次轮换时间")
    private LocalDateTime lastRotatedAt;
    @io.swagger.v3.oas.annotations.media.Schema(description = "最近一次凭证验证时间")
    private LocalDateTime lastVerifiedAt;
}
