package dev.hucoo.monitoring.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.monitoring.api.dto.AlertRuleCreateRequest;
import dev.hucoo.monitoring.api.dto.AlertRuleDTO;
import dev.hucoo.monitoring.domain.entity.AlertRule;

@Mapper(componentModel = "spring")
public interface AlertRuleConverter {

    AlertRuleDTO toDto(AlertRule entity);

    List<AlertRuleDTO> toDtoList(List<AlertRule> entities);

    AlertRule toEntity(AlertRuleCreateRequest request);

    void update(AlertRuleCreateRequest request, @MappingTarget AlertRule entity);
}
