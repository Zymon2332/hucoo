package dev.hucoo.file.api.dto;

import java.io.Serial;
import java.io.Serializable;

import lombok.Data;

/**
 * 上传请求的附加字段（与 multipart 的 {@code file} 字段一起提交）。
 */
@Data
public class FileUploadForm implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 业务归属类型，例如 AGENT_TEMPLATE / MCP_PACKAGE / PROJECT。 */
    private String bizType;

    private String bizId;

    /** PRIVATE / TENANT / PUBLIC，默认 PRIVATE。 */
    private String visibility;

    private String displayName;
}
