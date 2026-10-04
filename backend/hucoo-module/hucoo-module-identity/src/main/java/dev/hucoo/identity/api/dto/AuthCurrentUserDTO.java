package dev.hucoo.identity.api.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthCurrentUserDTO {

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String status;
}
