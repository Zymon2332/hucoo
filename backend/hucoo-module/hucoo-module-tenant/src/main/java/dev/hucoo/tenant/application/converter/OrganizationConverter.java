package dev.hucoo.tenant.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.tenant.api.dto.OrganizationCreateRequest;
import dev.hucoo.tenant.api.dto.OrganizationDTO;
import dev.hucoo.tenant.domain.entity.Organization;

@Mapper(componentModel = "spring")
public interface OrganizationConverter {

    OrganizationDTO toDto(Organization entity);

    List<OrganizationDTO> toDtoList(List<Organization> entities);

    Organization toEntity(OrganizationCreateRequest request);

    void update(OrganizationCreateRequest request, @MappingTarget Organization entity);
}
