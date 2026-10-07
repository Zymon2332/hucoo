package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelChannelCreateRequest implements Serializable {

    @NotBlank
    private String channelCode;
    @NotBlank
    private String channelName;
    @NotBlank
    private String protocolType;
    @NotBlank
    private String endpoint;
    private String basePath;
    private String region;
    private String networkZone;
    private String authType = "API_KEY";
    private String protocolConfigJson;
    private Long requestTimeoutMs = 30000L;
    private Long streamTimeoutMs = 60000L;
    private Long networkPolicyId;
    private String status = "ACTIVE";
}
