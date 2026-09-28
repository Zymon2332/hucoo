package dev.hucoo.tenant.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.tenant.api.dto.TenantCreateRequest;
import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.domain.entity.Tenant;

@Mapper(componentModel = "spring")
public interface TenantConverter {

    TenantDTO toDto(Tenant entity);

    List<TenantDTO> toDtoList(List<Tenant> entities);

    Tenant toEntity(TenantCreateRequest request);

    void update(TenantCreateRequest request, @MappingTarget Tenant entity);
}
