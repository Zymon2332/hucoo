package dev.hucoo.audit.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AuditLogDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private Long operatorId;
    private String operatorName;
    private String action;
    private String resourceType;
    private String resourceId;
    private Integer result;
    private String clientIp;
}
