package dev.hucoo.integration.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class IntegrationAppDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String appCode;
    private String appName;
    private String integrationType;
    private String webhookUrl;
    private String oauthClientId;
    private Integer status;
}
