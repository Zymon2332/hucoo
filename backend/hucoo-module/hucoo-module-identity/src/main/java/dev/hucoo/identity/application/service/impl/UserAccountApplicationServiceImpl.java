package dev.hucoo.identity.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.identity.api.dto.UserAccountDTO;
import dev.hucoo.identity.api.dto.UserAccountQueryRequest;
import dev.hucoo.identity.api.dto.UserAccountOverviewDTO;
import dev.hucoo.identity.application.converter.UserAccountConverter;
import dev.hucoo.identity.application.service.UserAccountApplicationService;
import dev.hucoo.identity.domain.entity.UserAccount;
import dev.hucoo.identity.infrastructure.mapper.UserAccountMapper;
import dev.hucoo.identity.infrastructure.repository.UserAccountRepository;
import dev.hucoo.identity.infrastructure.mapper.PermissionMapper;
import dev.hucoo.commons.dto.PageResult;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class UserAccountApplicationServiceImpl extends ServiceImpl<UserAccountMapper, UserAccount>
        implements UserAccountApplicationService {

    private final UserAccountRepository userAccountRepository;
    private final UserAccountConverter userAccountConverter;
    private final PermissionMapper permissionMapper;

    public UserAccountApplicationServiceImpl(UserAccountRepository userAccountRepository,
                                          UserAccountConverter userAccountConverter,
                                          PermissionMapper permissionMapper) {
        this.userAccountRepository = userAccountRepository;
        this.userAccountConverter = userAccountConverter;
        this.permissionMapper = permissionMapper;
    }

    @Override
    public UserAccountConverter converter() {
        return userAccountConverter;
    }

    @Override
    public PageResult<UserAccountDTO> pageDtos(UserAccountQueryRequest request) {
        IPage<UserAccount> page = userAccountRepository.page(request.resolvePageNum(), request.resolvePageSize(), request.getKeyword());
        return PageResult.of(page.getRecords().stream().map(userAccountConverter::toDto).toList(),
                page.getTotal(), page.getCurrent(), page.getSize());
    }

    @Override
    public UserAccountOverviewDTO overview(Long id) {
        UserAccountOverviewDTO overview = new UserAccountOverviewDTO();
        overview.setUser(getDto(id));
        UserAccount user = getById(id);
        overview.setEffectivePermissions(permissionMapper.selectCodesByUserId(id, user.getTenantId()).stream().sorted().toList());
        overview.setApprovalCount(0L);
        return overview;
    }

}
