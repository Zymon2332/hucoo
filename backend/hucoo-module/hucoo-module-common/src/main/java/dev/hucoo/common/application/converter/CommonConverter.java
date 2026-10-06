package dev.hucoo.common.application.converter;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.common.api.dto.*;
import dev.hucoo.common.domain.entity.*;
import tools.jackson.databind.JsonNode;

@Mapper(unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommonConverter {
    @Mapping(target = "scope", expression = "java(scope(entity))")
    @Mapping(target = "source", expression = "java(scope(entity))")
    DictionaryTypeDTO type(DictionaryType entity);

    @Mapping(target = "scope", expression = "java(scope(entity))")
    @Mapping(target = "source", expression = "java(scope(entity))")
    DictionaryItemDTO item(DictionaryItem entity);

    @Mapping(target = "value", source = "valueJson")
    @Mapping(target = "scope", expression = "java(scope(entity))")
    @Mapping(target = "source", expression = "java(scope(entity))")
    SystemConfigDTO config(SystemConfig entity);

    default CommonScope scope(CommonRecord entity) {
        return PlatformConstants.SYSTEM_TENANT_ID.equals(entity.getTenantId()) ? CommonScope.PLATFORM : CommonScope.TENANT;
    }

    default JsonNode json(String value) {
        return JsonUtil.mapper().readTree(value);
    }
}
