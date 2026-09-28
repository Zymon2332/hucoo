package dev.hucoo.identity.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UserAccountDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String username;
    private String displayName;
    private String email;
    private String phone;
    private String roleCode;
    private Integer status;
}
