package dev.hucoo.identity.api.dto;

import java.time.LocalDateTime;
import java.util.List;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ApprovalDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String approvalType;
    private String resourceType;
    private String resourceId;
    private Long applicantId;
    private String status;
    private String reason;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private List<ApprovalStepDTO> steps;
}
