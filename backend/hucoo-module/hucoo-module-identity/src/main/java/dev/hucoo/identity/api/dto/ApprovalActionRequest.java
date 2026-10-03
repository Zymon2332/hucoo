package dev.hucoo.identity.api.dto;

import java.io.Serial;
import java.io.Serializable;

import lombok.Data;

@Data
public class ApprovalActionRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String reason;
}
