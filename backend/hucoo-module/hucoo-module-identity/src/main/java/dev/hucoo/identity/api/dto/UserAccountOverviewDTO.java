package dev.hucoo.identity.api.dto;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

import lombok.Data;

@Data
public class UserAccountOverviewDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private UserAccountDTO user;
    private List<String> effectivePermissions;
    private long approvalCount;
}
