package dev.hucoo.file.api.dto;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 下载地址。
 *
 * @see #mode PRESIGNED 为对象存储预签名直链，PROXY 为后端签名代理地址
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileUrlDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String url;
    private String method;
    private LocalDateTime expiresAt;
    private String mode;
}
