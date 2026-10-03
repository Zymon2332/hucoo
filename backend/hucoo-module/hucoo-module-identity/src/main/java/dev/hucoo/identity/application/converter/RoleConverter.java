package dev.hucoo.identity.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.identity.api.dto.RoleCreateRequest;
import dev.hucoo.identity.api.dto.RoleDTO;
import dev.hucoo.identity.domain.entity.Role;

@Mapper(componentModel = "spring")
public interface RoleConverter {

    RoleDTO toDto(Role entity);

    List<RoleDTO> toDtoList(List<Role> entities);

    Role toEntity(RoleCreateRequest request);

    void update(RoleCreateRequest request, @MappingTarget Role entity);
}
