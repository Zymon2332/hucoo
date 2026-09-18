package dev.hucoo.integration.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class IntegrationAppCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "appCode 不能为空")
    private String appCode;

    @NotBlank(message = "appName 不能为空")
    private String appName;

    @NotBlank(message = "integrationType 不能为空")
    private String integrationType;

    private String webhookUrl;

    private String oauthClientId;

    private Integer status;

}
