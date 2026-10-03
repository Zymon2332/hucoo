package dev.hucoo.identity.api.dto;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class PermissionDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String permissionCode;
    private String permissionName;
    private String resourceType;
    private String action;
    private String description;
    private Integer status;
}
