package dev.hucoo.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthLoginRequest {

    private String clientId = "ADMIN_CONSOLE";

    @NotBlank(message = "method 不能为空")
    private String method;

    @NotBlank(message = "identifier 不能为空")
    private String identifier;

    private String credential;
    private String tenantId;
    private String deviceId;
}
