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

    private List<T> records;
    private long total;
    private long pageNum;
    private long pageSize;
    private long pages;

    public static <T> PageResult<T> of(List<T> records, long total, long pageNum, long pageSize) {
        long effectivePageSize = pageSize > 0 ? pageSize : total;
        long pages = effectivePageSize > 0 ? (total + effectivePageSize - 1) / effectivePageSize : 0L;
        return new PageResult<>(records, total, pageNum, pageSize, pages);
    }

    public static <T> PageResult<T> empty(long pageNum, long pageSize) {
        return new PageResult<>(Collections.emptyList(), 0L, pageNum, pageSize, 0L);
    }
}
