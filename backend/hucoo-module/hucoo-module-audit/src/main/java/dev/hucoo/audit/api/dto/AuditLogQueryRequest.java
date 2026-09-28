package dev.hucoo.audit.api.dto;

import dev.hucoo.commons.dto.PageQuery;

import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
public class AuditLogQueryRequest extends PageQuery {

    private static final long serialVersionUID = 1L;
}
