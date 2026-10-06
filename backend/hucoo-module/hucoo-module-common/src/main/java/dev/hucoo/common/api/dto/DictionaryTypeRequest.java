package dev.hucoo.common.api.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class DictionaryTypeRequest {
    @NotBlank
    @Size(max = 128)
    @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9_.:-]*")
    private String code;
    @NotBlank
    @Size(max = 128)
    private String name;
    @NotNull
    private Boolean enabled = true;
    @Size(max = 512)
    private String remarks;
    @Min(0)
    private Integer version;
}
