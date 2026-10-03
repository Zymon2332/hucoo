package dev.hucoo.component.security.util;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.CryptoUtil;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.commons.util.StringUtil;

import tools.jackson.core.type.TypeReference;

public class JwtUtil {

    private final String secret;
    private final String keyId;

    public JwtUtil(String secret) {
        this(secret, "local-v1");
    }

    public JwtUtil(String secret, String keyId) {
        this.secret = StringUtil.defaultIfBlank(secret, "hucoo-agent-platform-local-secret-please-change");
        this.keyId = StringUtil.defaultIfBlank(keyId, "local-v1");
    }

    public String createToken(String subject, Map<String, Object> claims, Duration ttl) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (claims != null) {
            payload.putAll(claims);
        }
        long now = Instant.now().getEpochSecond();
        payload.put("sub", subject);
        payload.put("iat", now);
        payload.put("exp", now + ttl.toSeconds());

        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\",\"kid\":\"" + keyId + "\"}");
        String body = encode(JsonUtil.toJson(payload));
        String signature = sign(header + "." + body);
        return header + "." + body + "." + signature;
    }

    public Map<String, Object> parse(String token) {
        if (StringUtil.isBlank(token)) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "token 为空");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "token 格式不合法");
        }
        String expectedSignature = sign(parts[0] + "." + parts[1]);
        if (!CryptoUtil.secureEquals(expectedSignature, parts[2])) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "token 签名校验失败");
        }
        Map<String, Object> payload = JsonUtil.parse(decode(parts[1]), new TypeReference<Map<String, Object>>() {
        });
        if (payload == null) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "token 内容无法解析");
        }
        Object exp = payload.get("exp");
        if (exp instanceof Number expSeconds && expSeconds.longValue() < Instant.now().getEpochSecond()) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, "token 已过期");
        }
        return payload;
    }

    public Optional<String> subject(String token) {
        return Optional.ofNullable(parse(token).get("sub")).map(String::valueOf);
    }

    public String sign(String data) {
        return CryptoUtil.hmacSha256Base64Url(data, secret);
    }

    private String encode(String data) {
        return CryptoUtil.base64UrlEncode(data.getBytes(StandardCharsets.UTF_8));
    }

    private String decode(String data) {
        return new String(CryptoUtil.base64UrlDecode(data), StandardCharsets.UTF_8);
    }
}
