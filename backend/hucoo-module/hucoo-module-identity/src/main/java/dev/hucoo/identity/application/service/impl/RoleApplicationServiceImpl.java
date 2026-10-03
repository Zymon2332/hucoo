package dev.hucoo.identity.application.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import dev.hucoo.identity.application.converter.RoleConverter;
import dev.hucoo.identity.application.service.RoleApplicationService;
import dev.hucoo.identity.domain.entity.Role;
import dev.hucoo.identity.infrastructure.mapper.RoleMapper;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class RoleApplicationServiceImpl extends ServiceImpl<RoleMapper, Role>
        implements RoleApplicationService {

    private final RoleConverter roleConverter;

    public RoleApplicationServiceImpl(RoleConverter roleConverter) {
        this.roleConverter = roleConverter;
    }

    @Override
    public RoleConverter converter() {
        return roleConverter;
    }
}
