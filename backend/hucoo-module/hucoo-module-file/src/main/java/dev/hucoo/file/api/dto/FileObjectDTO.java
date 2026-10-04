package dev.hucoo.file.api.dto;

import java.time.LocalDateTime;

import dev.hucoo.commons.dto.BaseDTO;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@EqualsAndHashCode(callSuper = true)
public class FileObjectDTO extends BaseDTO {

    private static final long serialVersionUID = 1L;

    private String tenantId;
    private String storageType;
    private String bucketName;
    private String objectKey;
    private String fileName;
    private String displayName;
    private String extension;
    private String contentType;
    private Long sizeBytes;
    private String sha256;
    private String etag;
    private String visibility;
    private String status;
    private String scanStatus;
    private String scanResult;
    private String bizType;
    private String bizId;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long ownerId;

    private String ownerName;
    private String source;
    private Integer refCount;
    private Long downloadCount;
    private String metadata;
    private LocalDateTime lastAccessAt;
    private LocalDateTime expiresAt;
}
