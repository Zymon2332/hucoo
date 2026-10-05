package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelChannelDTO extends BaseDTO {
    private Long providerId;
    private String channelCode;
    private String channelName;
    private String protocolType;
    private String endpoint;
    private String basePath;
    private String region;
    private String networkZone;
    private String authType;
    private String protocolConfigJson;
    private Long requestTimeoutMs;
    private Long streamTimeoutMs;
    private Long networkPolicyId;
    private String status;
    private String approvalStatus;
    private String healthStatus;
    private LocalDateTime lastHealthCheckedAt;
}
