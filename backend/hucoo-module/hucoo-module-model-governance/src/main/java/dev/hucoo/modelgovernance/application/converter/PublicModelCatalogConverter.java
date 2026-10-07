package dev.hucoo.modelgovernance.application.converter;

import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.modelgovernance.client.dto.PublicModelDTO;
import dev.hucoo.modelgovernance.domain.entity.LogicalModel;
import dev.hucoo.modelgovernance.domain.entity.ModelVersion;

@Mapper(componentModel = "spring")
public interface PublicModelCatalogConverter {
    @Mapping(target = "inputModalities", expression = "java(modalities(version.getInputModalitiesJson()))")
    @Mapping(target = "outputModalities", expression = "java(modalities(version.getOutputModalitiesJson()))")
    PublicModelDTO toDto(LogicalModel model, ModelVersion version, List<String> capabilities);

    default List<String> modalities(String json) {
        return JsonUtil.parseList(json, String.class).stream().filter(value -> value != null && !value.isBlank())
                .distinct().sorted().toList();
    }
}
