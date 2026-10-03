package dev.hucoo.modelgovernance.api.dto;

import java.io.Serializable;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModelProviderCreateRequest implements Serializable {
    @NotBlank private String providerCode;
    @NotBlank private String providerName;
    private String endpoint;
    private Integer status;
}
