package dev.hucoo.common.api.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class DictionaryItemRequest {
    @NotBlank
    @Size(max = 128)
    private String label;
    @NotBlank
    @Size(max = 128)
    private String value;
    @NotNull
    @Min(0)
    private Integer sortOrder = 0;
    @NotNull
    private Boolean enabled = true;
    @Size(max = 512)
    private String remarks;
    @Min(0)
    private Integer version;
}
