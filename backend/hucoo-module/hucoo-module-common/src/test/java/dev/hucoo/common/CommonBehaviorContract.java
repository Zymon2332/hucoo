package dev.hucoo.common;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.common.api.dto.*;
import dev.hucoo.common.application.service.*;
import dev.hucoo.component.database.tenant.CurrentTenantContext;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The very same behavior suite runs against memory and real PostgreSQL.
 */
abstract class CommonBehaviorContract {
    @Autowired
    DictionaryService dictionaries;
    @Autowired
    SystemConfigService configs;
    String code;

    @BeforeEach
    void setup() {
        CurrentTenantContext.set(PlatformConstants.SYSTEM_TENANT_ID);
        code = UUID.randomUUID().toString();
    }

    @AfterEach
    void cleanup() {
        CurrentTenantContext.clear();
    }

    void tenant(String id) {
        CurrentTenantContext.set(id);
    }

    DictionaryTypeRequest typeRequest() {
        var r = new DictionaryTypeRequest();
        r.setCode(code);
        r.setName("状态");
        return r;
    }

    DictionaryItemRequest itemRequest(String value, String label, int order) {
        var r = new DictionaryItemRequest();
        r.setValue(value);
        r.setLabel(label);
        r.setSortOrder(order);
        return r;
    }

    SystemConfigRequest configRequest(ConfigValueType type, String json) {
        var r = new SystemConfigRequest();
        r.setKey(code);
        r.setName("通用参数");
        r.setGroup("limits");
        r.setValueType(type);
        r.setValue(JsonUtil.mapper().readTree(json));
        return r;
    }

    void error(int status, Runnable operation) {
        assertEquals(status, assertThrows(BusinessException.class, operation::run).getCode());
    }

    @Test
    void dictionaryMergeDisableDeleteAndTenantIsolation() {
        var platform = dictionaries.createType(CommonScope.PLATFORM, typeRequest());
        dictionaries.createItem(platform.getId(), CommonScope.PLATFORM, itemRequest("a", "平台A", 2));
        dictionaries.createItem(platform.getId(), CommonScope.PLATFORM, itemRequest("b", "平台B", 1));
        tenant("tenant-a");
        assertEquals(List.of("b", "a"), dictionaries.options(code).stream().map(DictionaryItemDTO::getValue).toList());
        var local = dictionaries.createType(CommonScope.TENANT, typeRequest());
        var request = itemRequest("a", "租户A", 0);
        var item = dictionaries.createItem(local.getId(), CommonScope.TENANT, request);
        assertEquals(List.of("租户A", "平台B"), dictionaries.options(code).stream().map(DictionaryItemDTO::getLabel).toList());
        assertEquals(CommonScope.TENANT, dictionaries.options(code).getFirst().getSource());
        request.setEnabled(false);
        request.setVersion(item.getVersion());
        item = dictionaries.updateItem(local.getId(), item.getId(), CommonScope.TENANT, request);
        assertEquals(List.of("b"), dictionaries.options(code).stream().map(DictionaryItemDTO::getValue).toList());
        dictionaries.deleteItem(local.getId(), item.getId(), CommonScope.TENANT, item.getVersion());
        assertEquals(2, dictionaries.options(code).size());
        dictionaries.createItem(local.getId(), CommonScope.TENANT, itemRequest("a", "重建", 0));
        tenant("tenant-b");
        error(404, () -> dictionaries.type(local.getId(), CommonScope.TENANT));
        error(404, () -> dictionaries.createItem(local.getId(), CommonScope.TENANT, itemRequest("x", "跨租户", 0)));
        assertEquals("平台B", dictionaries.options(code).getFirst().getLabel());
        tenant("tenant-a");
        dictionaries.deleteType(local.getId(), CommonScope.TENANT, local.getVersion());
        assertEquals(2, dictionaries.options(code).size());
        dictionaries.createType(CommonScope.TENANT, typeRequest());
    }

    @Test
    void typeDisableAndPlatformDeletionPreserveTenantItems() {
        var platform = dictionaries.createType(CommonScope.PLATFORM, typeRequest());
        tenant("tenant-a");
        var request = typeRequest();
        var local = dictionaries.createType(CommonScope.TENANT, request);
        dictionaries.createItem(local.getId(), CommonScope.TENANT, itemRequest("x", "租户项", 0));
        request.setVersion(local.getVersion());
        request.setEnabled(false);
        local = dictionaries.updateType(local.getId(), CommonScope.TENANT, request);
        assertTrue(dictionaries.options(code).isEmpty());
        request.setVersion(local.getVersion());
        request.setEnabled(true);
        dictionaries.updateType(local.getId(), CommonScope.TENANT, request);
        tenant(PlatformConstants.SYSTEM_TENANT_ID);
        dictionaries.deleteType(platform.getId(), CommonScope.PLATFORM, platform.getVersion());
        tenant("tenant-a");
        assertEquals("租户项", dictionaries.options(code).getFirst().getLabel());
    }

    @Test
    void duplicateAndImmutableFieldsAndStaleVersions() {
        tenant("tenant-a");
        var request = typeRequest();
        var type = dictionaries.createType(CommonScope.TENANT, request);
        error(409, () -> dictionaries.createType(CommonScope.TENANT, request));
        request.setVersion(type.getVersion());
        request.setCode("changed");
        error(400, () -> dictionaries.updateType(type.getId(), CommonScope.TENANT, request));
        request.setCode(code);
        request.setVersion(null);
        error(400, () -> dictionaries.updateType(type.getId(), CommonScope.TENANT, request));
        request.setVersion(type.getVersion());
        dictionaries.updateType(type.getId(), CommonScope.TENANT, request);
        error(409, () -> dictionaries.updateType(type.getId(), CommonScope.TENANT, request));
        error(409, () -> dictionaries.deleteType(type.getId(), CommonScope.TENANT, type.getVersion()));
        var item = dictionaries.createItem(type.getId(), CommonScope.TENANT, itemRequest("one", "One", 0));
        error(409, () -> dictionaries.createItem(type.getId(), CommonScope.TENANT, itemRequest("one", "Duplicate", 1)));
        var itemChange = itemRequest("different", "One", 0);
        itemChange.setVersion(item.getVersion());
        error(400, () -> dictionaries.updateItem(type.getId(), item.getId(), CommonScope.TENANT, itemChange));
        var another = typeRequest();
        another.setCode(code + ".other");
        var other = dictionaries.createType(CommonScope.TENANT, another);
        error(404, () -> dictionaries.item(other.getId(), item.getId(), CommonScope.TENANT));
    }

    @Test
    void typedValuesRoundTrip() {
        for (var pair : List.of(new String[]{"STRING", "\"text\""}, new String[]{"NUMBER", "12.125"},
                new String[]{"BOOLEAN", "false"}, new String[]{"JSON", "{\"items\":[1,2]}"}, new String[]{"JSON", "[1,2]"})) {
            code = UUID.randomUUID().toString();
            var request = configRequest(ConfigValueType.valueOf(pair[0]), pair[1]);
            var created = configs.create(CommonScope.PLATFORM, request);
            assertEquals(request.getValue(), created.getValue());
            tenant("tenant-a");
            assertEquals(CommonScope.PLATFORM, configs.effective(code).getSource());
            assertEquals(request.getValue(), configs.effective(code).getValue());
            tenant(PlatformConstants.SYSTEM_TENANT_ID);
        }
    }

    @Test
    void configOverrideDisableDeleteAndGroupMove() {
        var platform = configs.create(CommonScope.PLATFORM, configRequest(ConfigValueType.NUMBER, "10"));
        tenant("tenant-a");
        var request = configRequest(ConfigValueType.NUMBER, "20");
        request.setGroup("tenant-group");
        var local = configs.create(CommonScope.TENANT, request);
        assertEquals(20, configs.effective(code).getValue().intValue());
        assertTrue(configs.effectiveGroup("limits").stream().noneMatch(c -> c.getKey().equals(code)));
        assertTrue(configs.effectiveGroup("tenant-group").stream().anyMatch(c -> c.getKey().equals(code)));
        request.setVersion(local.getVersion());
        request.setEnabled(false);
        local = configs.update(local.getId(), CommonScope.TENANT, request);
        error(404, () -> configs.effective(code));
        assertTrue(configs.effectiveGroup(null).stream().noneMatch(c -> c.getKey().equals(code)));
        tenant("tenant-b");
        assertEquals(10, configs.effective(code).getValue().intValue());
        Long localId = local.getId();
        error(404, () -> configs.detail(localId, CommonScope.TENANT));
        tenant("tenant-a");
        configs.delete(local.getId(), CommonScope.TENANT, local.getVersion());
        assertEquals(platform.getValue(), configs.effective(code).getValue());
        configs.create(CommonScope.TENANT, configRequest(ConfigValueType.NUMBER, "30"));
    }

    @Test
    void invalidValuesAndIncompatibleOverridesRejected() {
        tenant("tenant-a");
        for (var pair : List.of(new String[]{"STRING", "1"}, new String[]{"NUMBER", "\"1\""}, new String[]{"BOOLEAN", "1"},
                new String[]{"JSON", "true"}, new String[]{"JSON", "null"})) {
            error(400, () -> configs.create(CommonScope.TENANT, configRequest(ConfigValueType.valueOf(pair[0]), pair[1])));
        }
        tenant(PlatformConstants.SYSTEM_TENANT_ID);
        configs.create(CommonScope.PLATFORM, configRequest(ConfigValueType.BOOLEAN, "true"));
        tenant("tenant-a");
        error(400, () -> configs.create(CommonScope.TENANT, configRequest(ConfigValueType.STRING, "\"true\"")));
        var request = configRequest(ConfigValueType.BOOLEAN, "false");
        var local = configs.create(CommonScope.TENANT, request);
        error(409, () -> configs.create(CommonScope.TENANT, request));
        request.setVersion(local.getVersion());
        request.setValueType(ConfigValueType.NUMBER);
        request.setValue(JsonUtil.mapper().readTree("1"));
        error(400, () -> configs.update(local.getId(), CommonScope.TENANT, request));
        request.setValueType(ConfigValueType.BOOLEAN);
        request.setValue(JsonUtil.mapper().readTree("true"));
        request.setKey("renamed");
        error(400, () -> configs.update(local.getId(), CommonScope.TENANT, request));
        request.setKey(code);
        configs.update(local.getId(), CommonScope.TENANT, request);
        error(409, () -> configs.update(local.getId(), CommonScope.TENANT, request));
        error(409, () -> configs.delete(local.getId(), CommonScope.TENANT, local.getVersion()));
    }

    @Test
    void ownKeysAndPlatformWritesCannotEscapeTenantContext() {
        tenant("tenant-a");
        configs.create(CommonScope.TENANT, configRequest(ConfigValueType.STRING, "\"private\""));
        assertEquals(CommonScope.TENANT, configs.effective(code).getScope());
        error(403, () -> configs.create(CommonScope.PLATFORM, configRequest(ConfigValueType.STRING, "\"global\"")));
        error(403, () -> dictionaries.createType(CommonScope.PLATFORM, typeRequest()));
        tenant("tenant-b");
        error(404, () -> configs.effective(code));
        error(404, () -> dictionaries.options(code));
    }

    @Test
    void paginationFiltersAreScopedAndLiteral() {
        tenant("tenant-a");
        String prefix = code;
        for (int i = 0; i < 3; i++) {
            code = prefix + "." + i;
            var r = configRequest(ConfigValueType.STRING, "\"v\"");
            r.setEnabled(i != 2);
            configs.create(CommonScope.TENANT, r);
        }
        code = prefix;
        var query = new CommonQuery();
        query.setKeyword(prefix);
        query.setGroup("limits");
        query.setPageSize(1L);
        query.setEnabled(true);
        var page = configs.page(query);
        assertEquals(2, page.getTotal());
        assertEquals(1, page.getItems().size());
        assertEquals(2, page.getPages());
        query.setPage(2L);
        assertEquals(prefix + ".1", configs.page(query).getItems().getFirst().getKey());
        query.setKeyword("%" + prefix);
        assertEquals(0, configs.page(query).getTotal());
        query.setKeyword(prefix);
        query.setPage(Long.MAX_VALUE);
        assertTrue(configs.page(query).getItems().isEmpty());
        tenant("tenant-b");
        query.setPage(1L);
        assertEquals(0, configs.page(query).getTotal());
        tenant(PlatformConstants.SYSTEM_TENANT_ID);
        configs.create(CommonScope.PLATFORM, configRequest(ConfigValueType.STRING, "\"p\""));
        tenant("tenant-b");
        query.setScope(CommonScope.PLATFORM);
        assertEquals(1, configs.page(query).getTotal());
        assertEquals(code, configs.page(query).getItems().getFirst().getKey());
    }

    @Test
    void concurrentCreatesEnforceScopedUniqueness() throws Exception {
        String key = code;
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var operation = (java.util.concurrent.Callable<Integer>) () -> {
                CurrentTenantContext.set("concurrent-tenant");
                try {
                    var request = configRequest(ConfigValueType.STRING, "\"value\"");
                    request.setKey(key);
                    configs.create(CommonScope.TENANT, request);
                    return 200;
                } catch (BusinessException e) {
                    return e.getCode();
                } finally {
                    CurrentTenantContext.clear();
                }
            };
            var results = executor.invokeAll(List.of(operation, operation));
            assertEquals(List.of(200, 409), results.stream().map(f -> {
                try {
                    return f.get();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }).sorted().toList());
        }
    }

    @Test
    void fullUpdateCanClearRemarks() {
        tenant("tenant-a");
        var request = configRequest(ConfigValueType.STRING, "\"value\"");
        request.setRemarks("temporary");
        var row = configs.create(CommonScope.TENANT, request);
        request.setRemarks(null);
        request.setVersion(row.getVersion());
        assertNull(configs.update(row.getId(), CommonScope.TENANT, request).getRemarks());
    }
}
