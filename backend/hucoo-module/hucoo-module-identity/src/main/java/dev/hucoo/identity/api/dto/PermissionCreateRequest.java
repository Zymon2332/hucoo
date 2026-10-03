package dev.hucoo.identity.api.dto;

import java.io.Serial;
import java.io.Serializable;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PermissionCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "permissionCode 不能为空")
    private String permissionCode;

    @NotBlank(message = "permissionName 不能为空")
    private String permissionName;

    private String resourceType;
    private String action;
    private String description;
    private Integer status = 1;
}
