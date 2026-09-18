package dev.hucoo.monitoring.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.monitoring.api.dto.AlertRuleCreateRequest;
import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.api.dto.AlertRuleQueryRequest;

public interface AlertRuleFacade extends ModuleFacade {

    PageResult<AlertRuleDTO> pageDtos(AlertRuleQueryRequest request);

    AlertRuleDTO getDto(Long id);

    AlertRuleDTO create(AlertRuleCreateRequest request);

    AlertRuleDTO update(Long id, AlertRuleCreateRequest request);

    boolean remove(Long id);

    @Override
    default String moduleName() {
        return "hucoo-module-monitoring";
    }
}
