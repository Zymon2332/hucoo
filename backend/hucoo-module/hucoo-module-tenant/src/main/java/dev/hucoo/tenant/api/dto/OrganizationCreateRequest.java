package dev.hucoo.tenant.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class OrganizationCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long parentId;

    @NotBlank(message = "orgCode 不能为空")
    private String orgCode;

    @NotBlank(message = "orgName 不能为空")
    private String orgName;

    private String orgType;

    private Long ownerId;

    private Integer status = 1;

}
