package dev.hucoo.toolmcp.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class McpServerRegistrationCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "serverCode 不能为空")
    private String serverCode;

    @NotBlank(message = "serverName 不能为空")
    private String serverName;

    private String endpoint;

    private String transport;

    private Integer reviewStatus;

    private String networkPolicy;

}
