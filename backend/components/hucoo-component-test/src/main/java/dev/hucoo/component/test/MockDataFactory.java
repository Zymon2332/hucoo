package dev.hucoo.component.test;

import java.util.LinkedHashMap;
import java.util.Map;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;

public final class MockDataFactory {

    private MockDataFactory() {
    }

    public static <T> Result<T> ok(T data) {
        return Result.ok(data);
    }

    public static <T> PageResult<T> page(java.util.List<T> records) {
        return PageResult.of(records, records.size(), 1L, records.size());
    }

    public static Map<String, Object> mapOf(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }
}
