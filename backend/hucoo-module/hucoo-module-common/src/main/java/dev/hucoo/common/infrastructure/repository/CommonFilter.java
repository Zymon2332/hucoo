package dev.hucoo.common.infrastructure.repository;

import java.util.Map;

/**
 * Property names are supplied only by application services, never by request input.
 */
public record CommonFilter(Map<String, Object> equalities, String keyword, Boolean enabled) {
    public static CommonFilter all() {
        return new CommonFilter(Map.of(), null, null);
    }

    public static CommonFilter equal(String property, Object value) {
        return new CommonFilter(Map.of(property, value), null, null);
    }
}
