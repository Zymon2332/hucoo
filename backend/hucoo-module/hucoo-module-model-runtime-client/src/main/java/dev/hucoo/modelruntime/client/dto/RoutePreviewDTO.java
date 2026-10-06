package dev.hucoo.modelruntime.client.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutePreviewDTO {

    private String model;
    private List<RouteAccountDTO> candidates;
}
