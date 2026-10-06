package dev.hucoo.common.api.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.commons.dto.BaseDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@EqualsAndHashCode(callSuper = true)
public class SystemConfigDTO extends BaseDTO {
    private String key;
    private String name;
    private String group;
    private ConfigValueType valueType;
    @io.swagger.v3.oas.annotations.media.Schema(implementation = Object.class, types = {"string", "number", "boolean", "object", "array"}, description = "由 valueType 决定的 JSON 值；JSON 类型限对象或数组")
    private tools.jackson.databind.JsonNode value;
    private Boolean enabled;
    private String remarks;
    private Integer version;
    private CommonScope scope;
    @Schema(description = "记录来源：PLATFORM 或 TENANT")
    private CommonScope source;
}
