package dev.hucoo.commons.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class StringUtilTest {

    @Test
    void shouldConvertCamelAndSnakeCase() {
        assertEquals("tenant_code", StringUtil.camelToSnake("tenantCode"));
        assertEquals("tenantCode", StringUtil.snakeToCamel("tenant_code"));
    }

    @Test
    void shouldMaskSensitiveText() {
        assertEquals("138****8000", StringUtil.maskPhone("13812348000"));
        assertEquals("a***b@agent.io", StringUtil.maskEmail("abczb@agent.io"));
    }

    @Test
    void shouldCheckBlankText() {
        assertTrue(StringUtil.isBlank("  "));
        assertFalse(StringUtil.isNotBlank(null));
    }
}
