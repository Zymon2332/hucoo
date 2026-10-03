package dev.hucoo.modelruntime.api.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoutePreviewDTO {
    private String model;
    private List<AccountDTO> candidates;
}
