package dev.hucoo.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthVerificationCodeRequest {

    @NotBlank(message = "channel 不能为空")
    private String channel;

    @NotBlank(message = "purpose 不能为空")
    private String purpose;

    @NotBlank(message = "destination 不能为空")
    private String destination;
}
