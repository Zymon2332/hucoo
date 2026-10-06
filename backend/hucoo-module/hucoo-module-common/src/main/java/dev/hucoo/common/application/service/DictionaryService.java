package dev.hucoo.common.application.service;

import java.util.*;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.common.api.DictionaryFacade;
import dev.hucoo.common.api.dto.*;
import dev.hucoo.common.application.converter.CommonConverter;
import dev.hucoo.common.domain.entity.*;
import dev.hucoo.common.infrastructure.repository.*;

public class DictionaryService implements DictionaryFacade {
    private final CommonRepository<DictionaryType> types;
    private final CommonRepository<DictionaryItem> items;
    private final CommonConverter converter;
    private final CommonAccess access;
    private final CommonTransactions transactions;

    public DictionaryService(CommonRepository<DictionaryType> types, CommonRepository<DictionaryItem> items,
                             CommonConverter converter, CommonAccess access, CommonTransactions transactions) {
        this.types = types;
        this.items = items;
        this.converter = converter;
        this.access = access;
        this.transactions = transactions;
    }

    public PageResult<DictionaryTypeDTO> types(CommonQuery query) {
        var page = types.page(access.platform(query.getScope()), new CommonFilter(Map.of(), query.getKeyword(), query.getEnabled()),
                query.resolvePageNum(), query.resolvePageSize());
        return PageResult.of(page.getItems().stream().map(converter::type).toList(), page.getTotal(), page.getPage(), page.getPageSize());
    }

    public DictionaryTypeDTO type(Long id, CommonScope scope) {
        return converter.type(access.require(types.find(access.platform(scope), id)));
    }

    public DictionaryTypeDTO createType(CommonScope scope, DictionaryTypeRequest request) {
        access.write(scope, "dictionary");
        return transactions.execute(() -> {
            DictionaryType entity = new DictionaryType();
            entity.setCode(request.getCode());
            entity.setName(request.getName());
            entity.setEnabled(request.getEnabled());
            entity.setRemarks(request.getRemarks());
            return converter.type(types.insert(entity));
        });
    }

    public DictionaryTypeDTO updateType(Long id, CommonScope scope, DictionaryTypeRequest request) {
        access.write(scope, "dictionary");
        return transactions.execute(() -> {
            DictionaryType entity = access.require(types.lock(id));
            access.version(entity, request.getVersion());
            access.immutable(entity.getCode(), request.getCode(), "字典编码");
            entity.setName(request.getName());
            entity.setEnabled(request.getEnabled());
            entity.setRemarks(request.getRemarks());
            return converter.type(types.update(entity));
        });
    }

    public boolean deleteType(Long id, CommonScope scope, Integer version) {
        access.write(scope, "dictionary");
        return transactions.execute(() -> {
            DictionaryType entity = access.require(types.lock(id));
            access.version(entity, version);
            for (DictionaryItem item : items.list(false, CommonFilter.equal("typeId", id))) items.delete(item);
            types.delete(entity);
            return true;
        });
    }

    public PageResult<DictionaryItemDTO> items(Long typeId, CommonQuery query) {
        access.require(types.find(access.platform(query.getScope()), typeId));
        var page = items.page(access.platform(query.getScope()), new CommonFilter(Map.of("typeId", typeId), query.getKeyword(), query.getEnabled()),
                query.resolvePageNum(), query.resolvePageSize());
        return PageResult.of(page.getItems().stream().map(converter::item).toList(), page.getTotal(), page.getPage(), page.getPageSize());
    }

    private DictionaryItem requireItem(Long typeId, Long id, boolean platform) {
        DictionaryItem item = access.require(items.find(platform, id));
        return access.require(Objects.equals(item.getTypeId(), typeId) ? item : null);
    }

    public DictionaryItemDTO item(Long typeId, Long id, CommonScope scope) {
        access.require(types.find(access.platform(scope), typeId));
        return converter.item(requireItem(typeId, id, access.platform(scope)));
    }

    public DictionaryItemDTO createItem(Long typeId, CommonScope scope, DictionaryItemRequest request) {
        access.write(scope, "dictionary");
        return transactions.execute(() -> {
            access.require(types.lock(typeId));
            DictionaryItem entity = new DictionaryItem();
            entity.setTypeId(typeId);
            entity.setValue(request.getValue());
            applyItem(entity, request);
            return converter.item(items.insert(entity));
        });
    }

    public DictionaryItemDTO updateItem(Long typeId, Long id, CommonScope scope, DictionaryItemRequest request) {
        access.write(scope, "dictionary");
        return transactions.execute(() -> {
            access.require(types.lock(typeId));
            DictionaryItem entity = requireItem(typeId, id, false);
            access.version(entity, request.getVersion());
            access.immutable(entity.getValue(), request.getValue(), "字典项值");
            applyItem(entity, request);
            return converter.item(items.update(entity));
        });
    }

    private void applyItem(DictionaryItem entity, DictionaryItemRequest request) {
        entity.setLabel(request.getLabel());
        entity.setSortOrder(request.getSortOrder());
        entity.setEnabled(request.getEnabled());
        entity.setRemarks(request.getRemarks());
    }

    public boolean deleteItem(Long typeId, Long id, CommonScope scope, Integer version) {
        access.write(scope, "dictionary");
        return transactions.execute(() -> {
            access.require(types.lock(typeId));
            DictionaryItem entity = requireItem(typeId, id, false);
            access.version(entity, version);
            items.delete(entity);
            return true;
        });
    }

    public List<DictionaryItemDTO> options(String code) {
        CommonFilter filter = CommonFilter.equal("code", code);
        DictionaryType platform = types.list(true, filter).stream().findFirst().orElse(null);
        DictionaryType tenant = types.list(false, filter).stream().findFirst().orElse(null);
        DictionaryType effective = access.require(tenant != null ? tenant : platform);
        if (!Boolean.TRUE.equals(effective.getEnabled())) return List.of();
        Map<String, DictionaryItem> merged = new HashMap<>();
        if (platform != null)
            items.list(true, CommonFilter.equal("typeId", platform.getId())).forEach(i -> merged.put(i.getValue(), i));
        if (tenant != null)
            items.list(false, CommonFilter.equal("typeId", tenant.getId())).forEach(i -> merged.put(i.getValue(), i));
        return merged.values().stream().filter(i -> Boolean.TRUE.equals(i.getEnabled()))
                .sorted(Comparator.comparing(DictionaryItem::getSortOrder).thenComparing(DictionaryItem::getValue))
                .map(converter::item).toList();
    }
}
