package dev.hucoo.commons.util;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

public final class JsonUtil {

    private static final Logger log = LoggerFactory.getLogger(JsonUtil.class);

    private static final JsonMapper MAPPER = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private JsonUtil() {
    }

    public static JsonMapper mapper() {
        return MAPPER;
    }

    public static String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JacksonException e) {
            log.warn("serialize object to json failed: {}", e.getMessage());
            return null;
        }
    }

    public static String toPrettyJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(value);
        } catch (JacksonException e) {
            log.warn("serialize object to pretty json failed: {}", e.getMessage());
            return null;
        }
    }

    public static <T> T parse(String json, Class<T> type) {
        if (StringUtil.isBlank(json)) {
            return null;
        }
        try {
            return MAPPER.readValue(json, type);
        } catch (JacksonException e) {
            log.warn("deserialize json to {} failed: {}", type.getSimpleName(), e.getMessage());
            return null;
        }
    }

    public static <T> T parse(String json, TypeReference<T> type) {
        if (StringUtil.isBlank(json)) {
            return null;
        }
        try {
            return MAPPER.readValue(json, type);
        } catch (JacksonException e) {
            log.warn("deserialize json to reference failed: {}", e.getMessage());
            return null;
        }
    }

    public static <T> List<T> parseList(String json, Class<T> elementType) {
        if (StringUtil.isBlank(json)) {
            return List.of();
        }
        try {
            return MAPPER.readValue(json, MAPPER.getTypeFactory().constructCollectionType(List.class, elementType));
        } catch (JacksonException e) {
            log.warn("deserialize json to list failed: {}", e.getMessage());
            return List.of();
        }
    }

    public static boolean isJson(String text) {
        if (StringUtil.isBlank(text)) {
            return false;
        }
        try {
            MAPPER.readTree(text);
            return true;
        } catch (JacksonException e) {
            return false;
        }
    }
}
