package dev.hucoo.identity.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.identity.api.dto.PermissionCreateRequest;
import dev.hucoo.identity.api.dto.PermissionDTO;
import dev.hucoo.identity.domain.entity.Permission;

@Mapper(componentModel = "spring")
public interface PermissionConverter {

    PermissionDTO toDto(Permission entity);

    List<PermissionDTO> toDtoList(List<Permission> entities);

    Permission toEntity(PermissionCreateRequest request);

    void update(PermissionCreateRequest request, @MappingTarget Permission entity);
}
