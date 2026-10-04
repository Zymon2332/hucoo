package dev.hucoo.file.api.dto;

import java.time.LocalDateTime;

import dev.hucoo.commons.dto.PageQuery;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@EqualsAndHashCode(callSuper = true)
public class FileObjectQueryRequest extends PageQuery {

    private static final long serialVersionUID = 1L;

    private String extension;
    private String bizType;
    private String bizId;
    private String status;
    private String visibility;
    private String storageType;

    @Schema(type = "string", description = "字符串形式的雪花 ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long ownerId;

    private Long minSize;
    private Long maxSize;
    private LocalDateTime createdFrom;
    private LocalDateTime createdTo;
}
