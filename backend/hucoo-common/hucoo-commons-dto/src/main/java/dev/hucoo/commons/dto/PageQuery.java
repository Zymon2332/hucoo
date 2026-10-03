package dev.hucoo.commons.dto;

import java.io.Serial;
import java.io.Serializable;

import lombok.Data;

@Data
public class PageQuery implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long page;
    private Long pageSize;
    private String keyword;

    public long resolvePageNum() {
        return page == null || page < 1 ? 1L : page;
    }

    public long resolvePageSize() {
        if (pageSize == null || pageSize < 1) {
            return 10L;
        }
        return Math.min(pageSize, 500L);
    }
}
