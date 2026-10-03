package dev.hucoo.identity.application.service;

import java.util.Map;

import dev.hucoo.identity.api.UserAccountFacade;
import dev.hucoo.identity.api.dto.UserAccountCreateRequest;
import dev.hucoo.identity.api.dto.UserAccountDTO;
import dev.hucoo.identity.api.dto.UserAccountQueryRequest;
import dev.hucoo.identity.api.dto.UserAccountOverviewDTO;
import dev.hucoo.identity.application.converter.UserAccountConverter;
import dev.hucoo.identity.domain.entity.UserAccount;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.IService;

public interface UserAccountApplicationService extends IService<UserAccount>, UserAccountFacade {

    UserAccountConverter converter();

    @Override
    default UserAccountOverviewDTO overview(Long id) {
        UserAccountOverviewDTO overview = new UserAccountOverviewDTO();
        overview.setUser(getDto(id));
        overview.setEffectivePermissions(java.util.List.of());
        overview.setApprovalCount(0L);
        return overview;
    }

    @Override
    default PageResult<UserAccountDTO> pageDtos(UserAccountQueryRequest request) {
        Page<UserAccount> page = page(new Page<>(request.resolvePageNum(), request.resolvePageSize()));
        return PageResult.of(page.getRecords().stream().map(converter()::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    default UserAccountDTO getDto(Long id) {
        UserAccount entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("UserAccount", id);
        }
        return converter().toDto(entity);
    }

    @Override
    default UserAccountDTO create(UserAccountCreateRequest request) {
        UserAccount entity = converter().toEntity(request);
        save(entity);
        return converter().toDto(entity);
    }

    @Override
    default UserAccountDTO update(Long id, UserAccountCreateRequest request) {
        UserAccount entity = getById(id);
        if (entity == null) {
            throw new ResourceNotFoundException("UserAccount", id);
        }
        converter().update(request, entity);
        updateById(entity);
        return converter().toDto(entity);
    }

    @Override
    default boolean remove(Long id) {
        return removeById(id);
    }

    @Override
    default Class<UserAccount> getEntityClass() {
        return UserAccount.class;
    }
}
