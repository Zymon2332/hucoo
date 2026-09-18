package dev.hucoo.modelgovernance.api.dto;

import dev.hucoo.commons.dto.BaseDTO;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelDefinitionDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String modelCode;
    private String modelName;
    private String provider;
    private String modelType;
    private String endpoint;
    private Integer status;
}
