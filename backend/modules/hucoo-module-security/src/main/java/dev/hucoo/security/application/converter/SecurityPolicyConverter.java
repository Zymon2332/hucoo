package dev.hucoo.security.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.security.api.dto.SecurityPolicyCreateRequest;
import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.domain.entity.SecurityPolicy;

@Mapper(componentModel = "spring")
public interface SecurityPolicyConverter {

    SecurityPolicyDTO toDto(SecurityPolicy entity);

    List<SecurityPolicyDTO> toDtoList(List<SecurityPolicy> entities);

    SecurityPolicy toEntity(SecurityPolicyCreateRequest request);

    void update(SecurityPolicyCreateRequest request, @MappingTarget SecurityPolicy entity);
}
