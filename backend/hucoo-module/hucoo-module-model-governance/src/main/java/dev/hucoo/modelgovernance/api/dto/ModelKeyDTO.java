package dev.hucoo.modelgovernance.api.dto;

import java.time.LocalDateTime;

import dev.hucoo.commons.dto.BaseDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ModelKeyDTO extends BaseDTO {
    private String keyName;
    private String keyRef;
    private String keyFingerprint;
    private String status;
    private LocalDateTime expiresAt;
    private LocalDateTime lastRotatedAt;
}
