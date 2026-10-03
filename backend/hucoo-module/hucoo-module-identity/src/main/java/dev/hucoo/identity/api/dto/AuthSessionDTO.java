package dev.hucoo.identity.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthSessionDTO {

    private String sessionId;
    private String clientId;
    private String deviceId;
    private String tenantId;
    private String status;
    private String expiresAt;
    private String createdAt;
}
