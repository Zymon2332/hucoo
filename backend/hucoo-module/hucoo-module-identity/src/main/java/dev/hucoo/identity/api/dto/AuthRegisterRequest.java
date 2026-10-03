package dev.hucoo.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthRegisterRequest {

    @NotBlank(message = "identifier 不能为空")
    private String identifier;

    @NotBlank(message = "password 不能为空")
    @Size(min = 8, max = 128, message = "password 长度必须为 8 到 128 位")
    private String password;

    private String displayName;
}
