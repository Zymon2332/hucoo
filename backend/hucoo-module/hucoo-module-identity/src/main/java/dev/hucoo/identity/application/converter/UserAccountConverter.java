package dev.hucoo.identity.application.converter;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import dev.hucoo.identity.api.dto.UserAccountCreateRequest;
import dev.hucoo.identity.api.dto.UserAccountDTO;
import dev.hucoo.identity.domain.entity.UserAccount;

@Mapper(componentModel = "spring")
public interface UserAccountConverter {

    UserAccountDTO toDto(UserAccount entity);

    List<UserAccountDTO> toDtoList(List<UserAccount> entities);

    UserAccount toEntity(UserAccountCreateRequest request);

    void update(UserAccountCreateRequest request, @MappingTarget UserAccount entity);
}
