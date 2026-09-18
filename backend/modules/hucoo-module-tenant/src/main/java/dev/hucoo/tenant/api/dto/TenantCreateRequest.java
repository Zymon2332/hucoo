package dev.hucoo.tenant.api.dto;

import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TenantCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "tenantCode 不能为空")
    private String tenantCode;

    @NotBlank(message = "tenantName 不能为空")
    private String tenantName;

    private String contactEmail;

    @NotBlank(message = "planCode 不能为空")
    private String planCode;

    private Integer status;

    private LocalDateTime expireAt;

}
