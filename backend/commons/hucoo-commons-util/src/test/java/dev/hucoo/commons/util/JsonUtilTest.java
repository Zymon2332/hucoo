package dev.hucoo.commons.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class JsonUtilTest {

    @Test
    void shouldSerializeAndDeserializeObject() {
        Map<String, Object> payload = Map.of("tenantCode", "t-001", "enabled", true);

        String json = JsonUtil.toJson(payload);

        assertTrue(JsonUtil.isJson(json));
        Map<?, ?> parsed = JsonUtil.parse(json, Map.class);
        assertEquals("t-001", parsed.get("tenantCode"));
    }

    @Test
    void shouldParseList() {
        String json = "[{\"agentCode\":\"a-001\"},{\"agentCode\":\"a-002\"}]";

        List<Map> list = JsonUtil.parseList(json, Map.class);

        assertEquals(2, list.size());
        assertEquals("a-002", list.get(1).get("agentCode"));
    }

    @Test
    void shouldReturnNullOnBrokenJson() {
        assertNull(JsonUtil.parse("{invalid", Map.class));
    }
}
