package dev.hucoo.tenant.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class OrganizationCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long parentId;

    @NotBlank(message = "orgCode 不能为空")
    private String orgCode;

    @NotBlank(message = "orgName 不能为空")
    private String orgName;

    private String orgType;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long ownerId;

    private Integer status = 1;

}
