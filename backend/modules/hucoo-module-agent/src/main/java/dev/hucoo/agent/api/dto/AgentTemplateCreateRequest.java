package dev.hucoo.agent.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AgentTemplateCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "agentCode 不能为空")
    private String agentCode;

    @NotBlank(message = "agentName 不能为空")
    private String agentName;

    private String category;

    private String description;

    private String latestVersion;

    private Integer reviewStatus;

}
