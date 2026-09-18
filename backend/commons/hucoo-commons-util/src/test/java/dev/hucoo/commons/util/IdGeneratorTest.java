package dev.hucoo.commons.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

class IdGeneratorTest {

    @Test
    void shouldGenerateUniqueIds() {
        Set<Long> ids = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            ids.add(IdGenerator.nextId());
        }
        assertEquals(1000, ids.size());
    }

    @Test
    void shouldGenerateUuidAndTraceId() {
        assertNotEquals(IdGenerator.uuid(), IdGenerator.uuid());
        assertEquals(16, IdGenerator.traceId().length());
        assertEquals(6, IdGenerator.randomNumeric(6).length());
    }

    @Test
    void shouldGeneratePositiveIds() {
        assertTrue(IdGenerator.nextId() > 0);
    }
}
