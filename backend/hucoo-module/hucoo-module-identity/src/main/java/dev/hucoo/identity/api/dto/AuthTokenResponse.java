package dev.hucoo.identity.api.dto;

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
    private Long userId;
    private String username;
    private String tenantId;
    private List<String> availableTenantIds;
}
