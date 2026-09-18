package dev.hucoo.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class UserAccountCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String username;

    @NotBlank(message = "displayName 不能为空")
    private String displayName;

    private String email;

    private String phone;

    @NotBlank(message = "roleCode 不能为空")
    private String roleCode;

    private Integer status;

}
