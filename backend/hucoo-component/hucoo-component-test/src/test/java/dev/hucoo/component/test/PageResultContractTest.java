package dev.hucoo.component.test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.hucoo.commons.dto.BaseDTO;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.PageQuery;
import dev.hucoo.commons.util.JsonUtil;

class PageResultContractTest {

    private static class SerializationProbe extends BaseDTO {
        private static final long serialVersionUID = 1L;
        private BigDecimal amount;

        private SerializationProbe(Long id, LocalDateTime createdAt, BigDecimal amount) {
            setId(id);
            setCreatedAt(createdAt);
            this.amount = amount;
        }

        public BigDecimal getAmount() {
            return amount;
        }
    }

    @Test
    void shouldSerializeFrontendPageContract() {
        PageResult<String> result = PageResult.of(List.of("tenant-1"), 11L, 2L, 10L);

        String json = JsonUtil.toJson(result);

        assertTrue(json.contains("\"items\":[\"tenant-1\"]"));
        assertTrue(json.contains("\"page\":2"));
        assertTrue(json.contains("\"pageSize\":10"));
        assertTrue(json.contains("\"total\":11"));
        assertTrue(json.contains("\"pages\":2"));
        assertFalse(json.contains("\"records\""));
        assertFalse(json.contains("\"pageNum\""));
    }

    @Test
    void shouldDeserializeFrontendPageQuery() {
        PageQuery query = JsonUtil.parse("{\"page\":3,\"pageSize\":20,\"keyword\":\"tenant\"}", PageQuery.class);

        assertTrue(query != null);
        assertTrue(query.resolvePageNum() == 3L);
        assertTrue(query.resolvePageSize() == 20L);
        assertTrue("tenant".equals(query.getKeyword()));
    }

    @Test
    void shouldUsePlatformSerializationRules() {
        String json = JsonUtil.toJson(new SerializationProbe(922337203685477000L,
                LocalDateTime.of(2026, 10, 2, 17, 30, 45), new BigDecimal("1000000000000.2300")));

        assertTrue(json.contains("\"id\":\"922337203685477000\""));
        assertTrue(json.contains("\"createdAt\":\"2026-10-02T17:30:45\""));
        assertTrue(json.contains("\"amount\":1000000000000.2300"));
    }
}
