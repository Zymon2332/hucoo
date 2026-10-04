package dev.hucoo.identity.api.dto;

import java.time.LocalDateTime;
import java.util.List;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import dev.hucoo.commons.dto.BaseDTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ApprovalDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String approvalType;
    private String resourceType;
    private String resourceId;
    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long applicantId;
    private String status;
    private String reason;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private List<ApprovalStepDTO> steps;
}
