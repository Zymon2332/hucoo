package dev.hucoo.agent.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AgentTemplateDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String agentCode;
    private String agentName;
    private String category;
    private String description;
    private String latestVersion;
    private Integer reviewStatus;
}
