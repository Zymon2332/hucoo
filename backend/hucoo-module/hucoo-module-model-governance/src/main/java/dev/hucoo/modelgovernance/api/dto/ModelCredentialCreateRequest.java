package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelCredentialCreateRequest implements Serializable {
    @NotBlank
    private String credentialName;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证类型：API_KEY、OAUTH2、MTLS、NONE")
    private String credentialType = "API_KEY";
    @NotBlank
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @lombok.ToString.Exclude
    private String secret;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证所有权范围：PLATFORM、TENANT、PROJECT、USER")
    private String ownerScopeType = "TENANT";
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证所有权范围对象 ID")
    private String ownerScopeId;
    @io.swagger.v3.oas.annotations.media.Schema(description = "凭证过期时间")
    private LocalDateTime expiresAt;
}
