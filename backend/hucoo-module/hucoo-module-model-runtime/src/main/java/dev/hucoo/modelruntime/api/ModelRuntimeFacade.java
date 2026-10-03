package dev.hucoo.modelruntime.api;

import java.util.List;
import dev.hucoo.modelruntime.api.dto.AccountCreateRequest;
import dev.hucoo.modelruntime.api.dto.AccountDTO;
import dev.hucoo.modelruntime.api.dto.RoutePreviewDTO;

public interface ModelRuntimeFacade {
    List<AccountDTO> accounts(String model);
    AccountDTO createAccount(AccountCreateRequest request);
    AccountDTO updateStatus(Long id, String status);
    AccountDTO resetCircuit(Long id);
    RoutePreviewDTO preview(String model);
}
