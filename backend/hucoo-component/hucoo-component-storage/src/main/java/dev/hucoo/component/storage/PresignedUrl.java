package dev.hucoo.component.storage;

import java.time.Instant;
import java.util.Map;

/**
 * 预签名地址。
 *
 * @param url       可直接访问的地址
 * @param method    HTTP 方法：GET / PUT
 * @param expiresAt 过期时间
 * @param headers   上传时客户端必须携带的请求头（如 Content-Type）
 */
public record PresignedUrl(String url, String method, Instant expiresAt, Map<String, String> headers) {

    public PresignedUrl {
        headers = headers == null ? Map.of() : Map.copyOf(headers);
    }
}
