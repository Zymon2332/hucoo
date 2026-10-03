package dev.hucoo.identity.api.dto;

import dev.hucoo.commons.dto.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ApprovalQueryRequest extends PageQuery {

    private static final long serialVersionUID = 1L;

    private String status;
}
