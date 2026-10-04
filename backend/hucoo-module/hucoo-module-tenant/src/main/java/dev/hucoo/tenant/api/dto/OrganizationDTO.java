package dev.hucoo.tenant.api.dto;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import dev.hucoo.commons.dto.BaseDTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class OrganizationDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long parentId;
    private String orgCode;
    private String orgName;
    private String orgType;
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long ownerId;
    private Integer status;
}
