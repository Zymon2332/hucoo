package dev.hucoo.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthRefreshRequest {

    @NotBlank(message = "refreshToken 不能为空")
    private String refreshToken;

    private String clientId = "ADMIN_CONSOLE";
    private String deviceId;
}
