package dev.hucoo.billing.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.billing.api.dto.UsageRecordCreateRequest;
import dev.hucoo.billing.api.dto.UsageRecordDTO;
import dev.hucoo.billing.api.dto.UsageRecordQueryRequest;

public interface UsageRecordFacade extends ModuleFacade {

    PageResult<UsageRecordDTO> pageDtos(UsageRecordQueryRequest request);

    UsageRecordDTO getDto(Long id);

    UsageRecordDTO create(UsageRecordCreateRequest request);

    UsageRecordDTO update(Long id, UsageRecordCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-billing";
    }
}
