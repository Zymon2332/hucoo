package dev.hucoo.tenant.api.dto;

import java.time.LocalDateTime;
import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TenantDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String tenantCode;
    private String tenantName;
    private String contactEmail;
    private String planCode;
    private Integer status;
    private LocalDateTime expireAt;
}
