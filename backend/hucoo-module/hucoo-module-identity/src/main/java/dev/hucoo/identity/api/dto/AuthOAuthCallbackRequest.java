package dev.hucoo.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthOAuthCallbackRequest {

    @NotBlank(message = "code 不能为空")
    private String code;

    @NotBlank(message = "state 不能为空")
    private String state;

    private String clientId = "ADMIN_CONSOLE";
    private String tenantId;
    private String deviceId;
}
