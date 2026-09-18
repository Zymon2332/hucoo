package dev.hucoo.project.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ProjectWorkspaceDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String projectCode;
    private String projectName;
    private Long ownerId;
    private String workspacePolicy;
    private String repositoryUrl;
    private Integer status;
}
