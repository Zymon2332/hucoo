package dev.hucoo.file.api.dto;

import java.io.Serial;
import java.io.Serializable;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 其它模块登记一个已经写入对象存储的文件。
 *
 * <p>用于"调用方自己直传、再由平台登记元数据"的场景；文件内容不由本模块写入，
 * 因此调用方必须保证 bucket/objectKey 真实存在。
 */
@Data
public class FileRegisterRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "fileName 不能为空")
    private String fileName;

    @NotBlank(message = "objectKey 不能为空")
    private String objectKey;

    private String bucketName;
    private String storageType;
    private String contentType;
    private String sha256;
    private String etag;

    @NotNull(message = "sizeBytes 不能为空")
    private Long sizeBytes;

    private String bizType;
    private String bizId;
    private String visibility;
    private String source;
    private String displayName;
    private String metadata;
}
