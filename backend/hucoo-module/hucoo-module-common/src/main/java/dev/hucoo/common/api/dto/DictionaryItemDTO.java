package dev.hucoo.common.api.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@EqualsAndHashCode(callSuper = true)
public class DictionaryItemDTO extends BaseDTO {
    @Schema(type = "string")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long typeId;
    private String label;
    private String value;
    private Integer sortOrder;
    private Boolean enabled;
    private String remarks;
    private Integer version;
    private CommonScope scope;
    @Schema(description = "记录来源：PLATFORM 或 TENANT")
    private CommonScope source;
}
