package dev.hucoo.identity.api.dto;

import java.time.LocalDateTime;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import dev.hucoo.commons.dto.BaseDTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ApprovalStepDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long approvalId;
    private Integer stepNo;
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long approverId;
    private String status;
    private String action;
    private String comment;
    private LocalDateTime actedAt;
}
