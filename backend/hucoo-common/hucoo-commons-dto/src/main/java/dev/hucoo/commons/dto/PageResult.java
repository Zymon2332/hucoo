package dev.hucoo.commons.dto;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collections;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private List<T> items;
    private long total;
    private long page;
    private long pageSize;
    private long pages;

    public static <T> PageResult<T> of(List<T> items, long total, long page, long pageSize) {
        long effectivePageSize = pageSize > 0 ? pageSize : total;
        long pages = effectivePageSize > 0 ? (total + effectivePageSize - 1) / effectivePageSize : 0L;
        return new PageResult<>(items, total, page, pageSize, pages);
    }

    public static <T> PageResult<T> empty(long page, long pageSize) {
        return new PageResult<>(Collections.emptyList(), 0L, page, pageSize, 0L);
    }
}
