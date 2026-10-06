package dev.hucoo.common.infrastructure.repository;

import java.util.List;
import java.util.Map;

public record RecordDefinition(Map<String, String> columns, List<String> searchProperties,
                               List<String> uniqueProperties, List<String> orderProperties) {
    public String column(String property) {
        String column = columns.get(property);
        if (column == null) throw new IllegalArgumentException("Unsupported property: " + property);
        return column;
    }
}
