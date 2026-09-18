package dev.hucoo.toolmcp.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class McpServerRegistrationDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String serverCode;
    private String serverName;
    private String endpoint;
    private String transport;
    private Integer reviewStatus;
    private String networkPolicy;
}
