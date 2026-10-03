package dev.hucoo.identity.api.dto;

import java.time.LocalDateTime;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ApprovalStepDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private Long approvalId;
    private Integer stepNo;
    private Long approverId;
    private String status;
    private String action;
    private String comment;
    private LocalDateTime actedAt;
}
