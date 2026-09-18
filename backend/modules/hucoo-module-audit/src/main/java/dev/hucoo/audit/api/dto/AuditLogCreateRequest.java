package dev.hucoo.audit.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AuditLogCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull(message = "operatorId 不能为空")
    private Long operatorId;

    @NotBlank(message = "operatorName 不能为空")
    private String operatorName;

    private String action;

    @NotBlank(message = "resourceType 不能为空")
    private String resourceType;

    private String resourceId;

    private Integer result;

    private String clientIp;

}
