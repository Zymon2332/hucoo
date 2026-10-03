package dev.hucoo.identity.api.dto;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RoleDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String roleCode;
    private String roleName;
    private String scope;
    private Integer roleLevel;
    private Integer system;
    private Integer status;
}
