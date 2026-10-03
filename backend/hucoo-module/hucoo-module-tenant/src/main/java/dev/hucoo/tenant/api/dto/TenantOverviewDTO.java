package dev.hucoo.tenant.api.dto;

import java.io.Serial;
import java.io.Serializable;

import lombok.Data;

@Data
public class TenantOverviewDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private TenantDTO tenant;
    private long userCount;
    private long organizationCount;
    private long activeUserCount;
}
