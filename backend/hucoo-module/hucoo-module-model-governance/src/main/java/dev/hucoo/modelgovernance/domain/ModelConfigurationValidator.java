package dev.hucoo.modelgovernance.domain;

import java.net.URI;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;

public final class ModelConfigurationValidator {
    private ModelConfigurationValidator() { }

    public static void require(boolean condition, String message) {
        if (!condition) throw new BusinessException(CommonErrorCode.BAD_REQUEST, message);
    }

    public static String choice(String value, String fallback, String... choices) {
        String resolved = value == null || value.isBlank() ? fallback : value;
        require(resolved != null && Set.of(choices).contains(resolved), "不支持的配置值：" + resolved);
        return resolved;
    }

    public static void endpoint(String value) {
        try {
            URI uri = URI.create(value);
            require(uri.getScheme() != null && Set.of("https", "http").contains(uri.getScheme()) && uri.getHost() != null
                    && uri.getUserInfo() == null && uri.getQuery() == null && uri.getFragment() == null,
                    "渠道地址必须是 HTTP/HTTPS 服务地址，不能包含认证信息、查询参数或片段");
        } catch (IllegalArgumentException error) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "渠道地址格式不正确");
        }
    }

    public static void json(String value, boolean schemaVersion) {
        if (value == null) return;
        JsonNode node;
        try { node = JsonUtil.mapper().readTree(value); }
        catch (RuntimeException error) { throw new BusinessException(CommonErrorCode.BAD_REQUEST, "扩展配置必须是合法 JSON"); }
        require(node != null && !node.isNull(), "扩展配置不能是 JSON null");
        if (schemaVersion) require(node.isObject() && node.has("schemaVersion")
                && node.get("schemaVersion").isIntegralNumber() && node.get("schemaVersion").asInt() > 0,
                "协议配置必须包含正整数 schemaVersion");
        forbidSecrets(node);
    }

    private static void forbidSecrets(JsonNode node) {
        if (node.isObject()) {
            for (var entry : node.properties()) {
                String key = entry.getKey().replace("_", "").replace("-", "").toLowerCase(java.util.Locale.ROOT);
                require(!Set.of("apikey", "secret", "password", "token", "authorization", "accesstoken", "privatekey").contains(key),
                        "扩展配置不能保存密钥，请使用渠道凭证保险箱");
                forbidSecrets(entry.getValue());
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) forbidSecrets(child);
        }
    }
}
