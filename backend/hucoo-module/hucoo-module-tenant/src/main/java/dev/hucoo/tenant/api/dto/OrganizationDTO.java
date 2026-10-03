package dev.hucoo.tenant.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class OrganizationDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private Long parentId;
    private String orgCode;
    private String orgName;
    private String orgType;
    private Long ownerId;
    private Integer status;
}
