package dev.hucoo.common.application.service;

import java.util.*;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.common.api.SystemConfigFacade;
import dev.hucoo.common.api.dto.*;
import dev.hucoo.common.application.converter.CommonConverter;
import dev.hucoo.common.domain.entity.SystemConfig;
import dev.hucoo.common.infrastructure.repository.*;

public class SystemConfigService implements SystemConfigFacade {
    private final CommonRepository<SystemConfig> configs;
    private final CommonConverter converter;
    private final CommonAccess access;
    private final CommonTransactions transactions;

    public SystemConfigService(CommonRepository<SystemConfig> configs, CommonConverter converter,
                               CommonAccess access, CommonTransactions transactions) {
        this.configs = configs;
        this.converter = converter;
        this.access = access;
        this.transactions = transactions;
    }

    public PageResult<SystemConfigDTO> page(CommonQuery query) {
        var page = configs.page(access.platform(query.getScope()), new CommonFilter(
                        query.getGroup() == null ? Map.of() : Map.of("group", query.getGroup()), query.getKeyword(), query.getEnabled()),
                query.resolvePageNum(), query.resolvePageSize());
        return PageResult.of(page.getItems().stream().map(converter::config).toList(), page.getTotal(), page.getPage(), page.getPageSize());
    }

    public SystemConfigDTO detail(Long id, CommonScope scope) {
        return converter.config(access.require(configs.find(access.platform(scope), id)));
    }

    private void validate(SystemConfigRequest request) {
        var value = request.getValue();
        if (request.getValueType() == null || value == null || value.isNull())
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "配置类型和值不能为空");
        boolean valid = switch (request.getValueType()) {
            case STRING -> value.isString();
            case NUMBER -> value.isNumber() && Double.isFinite(value.doubleValue());
            case BOOLEAN -> value.isBoolean();
            case JSON -> value.isObject() || value.isArray();
        };
        if (!valid) throw new BusinessException(CommonErrorCode.BAD_REQUEST, "配置值与声明类型不匹配");
        configs.list(true, CommonFilter.equal("key", request.getKey())).stream().findFirst().ifPresent(platform -> {
            if (platform.getValueType() != request.getValueType())
                throw new BusinessException(CommonErrorCode.BAD_REQUEST, "租户覆盖必须保持平台配置值类型");
        });
    }

    private void apply(SystemConfig entity, SystemConfigRequest request) {
        entity.setName(request.getName());
        entity.setGroup(request.getGroup());
        entity.setValueJson(JsonUtil.mapper().writeValueAsString(request.getValue()));
        entity.setEnabled(request.getEnabled());
        entity.setRemarks(request.getRemarks());
    }

    public SystemConfigDTO create(CommonScope scope, SystemConfigRequest request) {
        access.write(scope, "config");
        return transactions.execute(() -> {
            validate(request);
            SystemConfig entity = new SystemConfig();
            entity.setKey(request.getKey());
            entity.setValueType(request.getValueType());
            apply(entity, request);
            return converter.config(configs.insert(entity));
        });
    }

    public SystemConfigDTO update(Long id, CommonScope scope, SystemConfigRequest request) {
        access.write(scope, "config");
        return transactions.execute(() -> {
            SystemConfig entity = access.require(configs.lock(id));
            access.version(entity, request.getVersion());
            access.immutable(entity.getKey(), request.getKey(), "配置键");
            access.immutable(entity.getValueType(), request.getValueType(), "配置值类型");
            validate(request);
            apply(entity, request);
            return converter.config(configs.update(entity));
        });
    }

    public boolean delete(Long id, CommonScope scope, Integer version) {
        access.write(scope, "config");
        return transactions.execute(() -> {
            SystemConfig entity = access.require(configs.lock(id));
            access.version(entity, version);
            configs.delete(entity);
            return true;
        });
    }

    public SystemConfigDTO effective(String key) {
        CommonFilter filter = CommonFilter.equal("key", key);
        SystemConfig tenant = configs.list(false, filter).stream().findFirst().orElse(null);
        SystemConfig entity = access.require(tenant != null ? tenant : configs.list(true, filter).stream().findFirst().orElse(null));
        return converter.config(access.require(Boolean.TRUE.equals(entity.getEnabled()) ? entity : null));
    }

    public List<SystemConfigDTO> effectiveGroup(String group) {
        // Merge by key BEFORE filtering by group; an override can move a key to another group.
        Map<String, SystemConfig> merged = new HashMap<>();
        configs.list(true, CommonFilter.all()).forEach(c -> merged.put(c.getKey(), c));
        configs.list(false, CommonFilter.all()).forEach(c -> merged.put(c.getKey(), c));
        return merged.values().stream().filter(c -> Boolean.TRUE.equals(c.getEnabled()))
                .filter(c -> group == null || Objects.equals(group, c.getGroup()))
                .sorted(Comparator.comparing(SystemConfig::getKey)).map(converter::config).toList();
    }
}
