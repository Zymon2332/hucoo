package dev.hucoo.file.api.dto;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FileObjectUpdateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Size(max = 255, message = "displayName 长度不能超过 255")
    private String displayName;

    /** PRIVATE / TENANT / PUBLIC。 */
    private String visibility;

    private String bizType;
    private String bizId;
    private String metadata;
    private LocalDateTime expiresAt;
}
