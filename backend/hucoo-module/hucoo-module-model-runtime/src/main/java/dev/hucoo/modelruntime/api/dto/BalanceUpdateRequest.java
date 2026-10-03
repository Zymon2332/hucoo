package dev.hucoo.modelruntime.api.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BalanceUpdateRequest {
    @NotNull private BigDecimal balance;
}
