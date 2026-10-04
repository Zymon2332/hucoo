package dev.hucoo.identity.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermissionMatrixRowDTO {

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long roleId;
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long permissionId;
    private Boolean granted;
}
