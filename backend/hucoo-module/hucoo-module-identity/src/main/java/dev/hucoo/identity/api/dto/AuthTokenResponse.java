package dev.hucoo.identity.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthTokenResponse {

    private String accessToken;
    private String tokenType;
    private long expiresIn;
    private String refreshToken;
    private String refreshTokenExpiresAt;
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;
    private String username;
    private String tenantId;
    private List<String> availableTenantIds;
}
