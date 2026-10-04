package dev.hucoo.project.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class ProjectWorkspaceCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "projectCode 不能为空")
    private String projectCode;

    @NotBlank(message = "projectName 不能为空")
    private String projectName;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
@JsonSerialize(using = ToStringSerializer.class)
    @NotNull(message = "ownerId 不能为空")
    private Long ownerId;

    private String workspacePolicy;

    private String repositoryUrl;

    private Integer status;

}
