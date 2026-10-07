package dev.hucoo.modelgovernance;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.modelgovernance.api.dto.PublicModelCatalogQuery;
import dev.hucoo.modelgovernance.domain.*;
import dev.hucoo.modelgovernance.domain.entity.*;
import dev.hucoo.modelgovernance.infrastructure.repository.InMemoryModelCatalogRepository;

class PublicModelCatalogApplicationServiceTest {
    enum Storage { MEMORY, MYBATIS }
    private CatalogTestDatabase database;

    private CatalogTestFixture fixture(Storage storage) throws Exception {
        var repository = storage == Storage.MEMORY ? new InMemoryModelCatalogRepository()
                : (database = new CatalogTestDatabase()).repository;
        var fixture = new CatalogTestFixture(repository);
        fixture.login("tenant-a");
        return fixture;
    }

    @AfterEach void cleanup() {
        CurrentTenantContext.clear(); CurrentUserContext.clear();
        if (database != null) database.close();
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void readsPlatformAndCurrentTenantOnlyWithoutChangingManagementScope(Storage storage) throws Exception {
        var f = fixture(storage);
        f.ready(PlatformConstants.SYSTEM_TENANT_ID, "a-provider", "system-model");
        f.ready("tenant-a", "b-provider", "tenant-model");
        f.ready("tenant-b", "c-provider", "other-model");
        var catalog = f.service().catalog(new PublicModelCatalogQuery(null));
        assertEquals(List.of("a-provider", "b-provider"), catalog.providers().stream().map(p -> p.providerCode()).toList());
        assertEquals("tenant-a", CurrentTenantContext.getTenantIdOrNull());
        assertEquals(List.of("tenant-model"), f.repository.list(LogicalModel.class).stream().map(LogicalModel::getModelCode).toList());
        CurrentTenantContext.clear();
        assertEquals(2, f.repository.publicSnapshot("tenant-a").list(LogicalModel.class).size());
        assertNull(CurrentTenantContext.getTenantIdOrNull());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void visibilityUsesIdentityScopesAndDenyOverridesNarrowerAllow(Storage storage) throws Exception {
        var f = fixture(storage);
        var parts = f.ready(PlatformConstants.SYSTEM_TENANT_ID, "vendor", "model");
        for (var grant : f.repository.publicSnapshot("tenant-a").list(ModelVisibilityGrant.class)) {
            CurrentTenantContext.set(grant.getTenantId()); f.repository.delete(ModelVisibilityGrant.class, grant.getId());
        }
        f.login("tenant-a");
        assertTrue(f.service().catalog(null).providers().isEmpty());
        var grant = f.grant(parts, "PROJECT", "7", "ALLOW");
        assertTrue(f.service().catalog(null).providers().isEmpty());
        assertTrue(f.service().catalog(new PublicModelCatalogQuery(8L)).providers().isEmpty());
        assertEquals(1, f.service().catalog(new PublicModelCatalogQuery(7L)).providers().size());
        grant.setValidFrom(CatalogTestFixture.NOW.plusSeconds(1)); f.save(grant);
        assertTrue(f.service().catalog(new PublicModelCatalogQuery(7L)).providers().isEmpty());
        grant.setValidFrom(null); grant.setValidTo(CatalogTestFixture.NOW); f.save(grant);
        assertTrue(f.service().catalog(new PublicModelCatalogQuery(7L)).providers().isEmpty());
        f.grant(parts, "USER", "42", "ALLOW");
        assertEquals(1, f.service().catalog(null).providers().size());
        f.grant(parts, "TENANT", "tenant-b", "DENY");
        assertEquals(1, f.service().catalog(null).providers().size());
        f.grant(parts, "TENANT", "tenant-a", "DENY");
        assertTrue(f.service().catalog(null).providers().isEmpty());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void filtersEveryPublicationAndRuntimeGate(Storage storage) throws Exception {
        var f = fixture(storage);
        var parts = f.ready("tenant-a", "vendor", "model");
        assertEquals(1, f.service().catalog(null).providers().size());
        checkHidden(f, parts.model(), m -> m.setLifecycleStatus("DRAFT"));
        checkHidden(f, parts.model(), m -> m.setSourceType("CUSTOM"));
        checkHidden(f, parts.model(), m -> m.setSourceType("LOCAL"));
        checkHidden(f, parts.model(), m -> m.setOwnerUserId(42L));
        checkHidden(f, parts.version(), v -> v.setReleaseStatus("SUSPENDED"));
        checkHidden(f, parts.version(), v -> v.setReleasedAt(CatalogTestFixture.NOW.plusSeconds(1)));
        checkHidden(f, parts.version(), v -> v.setDeprecatedAt(CatalogTestFixture.NOW));
        checkHidden(f, parts.provider(), p -> p.setApprovalStatus("DRAFT"));
        checkHidden(f, parts.provider(), p -> p.setStatus(0));
        checkHidden(f, parts.channel(), c -> c.setStatus("DRAINING"));
        checkHidden(f, parts.channel(), c -> c.setApprovalStatus("SUSPENDED"));
        checkHidden(f, parts.channel(), c -> c.setHealthStatus("UNHEALTHY"));
        checkHidden(f, parts.binding(), b -> b.setApprovalStatus("DRAFT"));
        checkHidden(f, parts.binding(), b -> b.setStatus("DISABLED"));
        checkHidden(f, parts.binding(), b -> b.setLastValidationRunId(null));
        checkHidden(f, parts.validation(), v -> v.setStatus("FAILED"));
        checkHidden(f, parts.validation(), v -> v.setBindingId(-1L));
        checkHidden(f, parts.validation(), v -> v.setModelVersionId(-1L));
        checkHidden(f, parts.credential(), c -> c.setStatus("REVOKED"));
        checkHidden(f, parts.credential(), c -> c.setExpiresAt(CatalogTestFixture.NOW));
        checkHidden(f, parts.credential(), c -> c.setSecretCiphertext(""));
        checkHidden(f, parts.credential(), c -> c.setOwnerScopeType("USER"));
        checkHidden(f, parts.credential(), c -> c.setChannelId(-1L));
        checkHidden(f, parts.route(), r -> r.setEnabled(0));
        checkHidden(f, parts.route(), r -> r.setScopeType("PROJECT"));
        parts.route().setModelVersionId(parts.version().getId()); f.save(parts.route());
        checkHidden(f, parts.route(), r -> r.setModelVersionId(-1L));
        checkHidden(f, parts.target(), t -> t.setStatus("DISABLED"));
        checkHidden(f, parts.target(), t -> t.setConfiguredWeight(0));
        checkHidden(f, parts.target(), t -> t.setCredentialId(-1L));
        f.repository.delete(LogicalModel.class, parts.model().getId());
        assertTrue(f.service().catalog(null).providers().isEmpty());
    }

    private <T extends BaseEntity> void checkHidden(CatalogTestFixture f, T entity, Consumer<T> change) {
        @SuppressWarnings("unchecked") Class<T> type = (Class<T>) entity.getClass();
        var changed = JsonUtil.parse(JsonUtil.toJson(entity), type);
        change.accept(changed); f.save(changed);
        assertTrue(f.service().catalog(null).providers().isEmpty(), type.getSimpleName() + ": " + JsonUtil.toJson(changed));
        // 原配置恢复时使用最新乐观锁版本。
        entity.setVersion(changed.getVersion()); f.save(entity);
        assertEquals(1, f.service().catalog(null).providers().size());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void handlesNoAuthChannelsAndRejectsForgedCrossTenantCredential(Storage storage) throws Exception {
        var f = fixture(storage);
        var p = f.ready(PlatformConstants.SYSTEM_TENANT_ID, "vendor", "model");
        var other = f.ready("tenant-b", "other", "other-model");
        p.target().setCredentialId(other.credential().getId()); f.save(p.target());
        assertTrue(f.service().catalog(null).providers().isEmpty());
        p.channel().setAuthType("NONE"); f.save(p.channel());
        p.target().setId(null); p.target().setCredentialId(null); f.save(p.target());
        assertEquals(1, f.service().catalog(null).providers().size());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void sortsDeduplicatesAndSelectsLatestUsableVersion(Storage storage) throws Exception {
        var f = fixture(storage);
        var old = f.ready("tenant-a", "z-vendor", "z-model");
        f.ready("tenant-a", "a-vendor", "a-model");
        ModelVersion latest = JsonUtil.parse(JsonUtil.toJson(old.version()), ModelVersion.class);
        latest.setId(null); latest.setVersionCode("v2"); latest.setReleasedAt(CatalogTestFixture.NOW.minusHours(1)); f.save(latest);
        ModelChannelBinding binding = JsonUtil.parse(JsonUtil.toJson(old.binding()), ModelChannelBinding.class);
        binding.setId(null); binding.setModelVersionId(latest.getId()); f.save(binding);
        ModelValidationRun validation = new ModelValidationRun(); validation.setTenantId("tenant-a");
        validation.setModelVersionId(latest.getId()); validation.setBindingId(binding.getId()); validation.setStatus("PASSED"); f.save(validation);
        binding.setLastValidationRunId(validation.getId()); f.save(binding);
        ModelRouteTarget target = JsonUtil.parse(JsonUtil.toJson(old.target()), ModelRouteTarget.class);
        target.setId(null); target.setBindingId(binding.getId()); f.save(target);
        target.setId(null); f.save(target);
        var catalog = f.service().catalog(null);
        assertEquals(List.of("a-vendor", "z-vendor"), catalog.providers().stream().map(p -> p.providerCode()).toList());
        assertEquals(1, catalog.providers().get(1).models().size());
        assertEquals("v2", catalog.providers().get(1).models().getFirst().versionCode());
        assertEquals(List.of("STREAMING"), catalog.providers().getFirst().models().getFirst().capabilities());
        assertEquals(catalog.catalogVersion(), f.service().catalog(null).catalogVersion());
        validation.setStatus("FAILED"); f.save(validation);
        assertEquals("v1", f.service().catalog(null).providers().get(1).models().getFirst().versionCode());
        assertNotEquals(catalog.catalogVersion(), f.service().catalog(null).catalogVersion());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void extensiblePolicyReceivesIdentityAndCannotBypassStableGates(Storage storage) throws Exception {
        var f = fixture(storage); var p = f.ready("tenant-a", "vendor", "model");
        var policy = new ModelCatalogReleasePolicy() {
            public String policyVersion() { return "allowlist-v2"; }
            public boolean isVisible(ModelCatalogPolicyContext ctx, ModelCatalogCandidate candidate) {
                assertEquals("tenant-a", ctx.tenantId()); assertEquals(42L, ctx.userId());
                assertEquals(7L, ctx.projectId()); assertEquals("model", ctx.modelCode()); assertEquals("v1", ctx.versionCode());
                assertFalse(ctx.catalogVersion().isBlank()); assertEquals(CatalogTestFixture.NOW, ctx.requestTime());
                return true;
            }
        };
        var publicCatalog = f.service(policy).catalog(new PublicModelCatalogQuery(7L));
        assertEquals("allowlist-v2", publicCatalog.policyVersion());
        assertNotEquals(f.service().catalog(null).catalogVersion(), publicCatalog.catalogVersion());
        p.model().setLifecycleStatus("DRAFT"); f.save(p.model());
        assertTrue(f.service(policy).catalog(new PublicModelCatalogQuery(7L)).providers().isEmpty());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void narrowerRouteScopeCannotFallThroughToPlatformRoute(Storage storage) throws Exception {
        var f = fixture(storage); var p = f.ready("tenant-a", "vendor", "model");
        var projectRoute = new ModelRoutePolicy();
        projectRoute.setTenantId("tenant-a"); projectRoute.setModelId(p.model().getId());
        projectRoute.setScopeType("PROJECT"); projectRoute.setScopeId("7"); projectRoute.setEnabled(1); f.save(projectRoute);
        assertEquals(1, f.service().catalog(null).providers().size());
        assertTrue(f.service().catalog(new PublicModelCatalogQuery(7L)).providers().isEmpty());
        assertEquals(1, f.service().catalog(new PublicModelCatalogQuery(8L)).providers().size());
        var target = JsonUtil.parse(JsonUtil.toJson(p.target()), ModelRouteTarget.class);
        target.setId(null); target.setRoutePolicyId(projectRoute.getId()); f.save(target);
        assertEquals(1, f.service().catalog(new PublicModelCatalogQuery(7L)).providers().size());
    }

    @org.junit.jupiter.api.Test
    void restoresTenantContextWhenSnapshotReadFails() {
        var repository = new InMemoryModelCatalogRepository() {
            @Override public synchronized <T extends BaseEntity> List<T> list(Class<T> type) {
                throw new IllegalStateException("storage unavailable");
            }
        };
        CurrentTenantContext.set("original-tenant");
        assertThrows(IllegalStateException.class, () -> repository.publicSnapshot("tenant-a"));
        assertEquals("original-tenant", CurrentTenantContext.getTenantIdOrNull());
        CurrentTenantContext.clear();
        assertThrows(IllegalStateException.class, () -> repository.publicSnapshot("tenant-a"));
        assertNull(CurrentTenantContext.getTenantIdOrNull());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void identityCannotBeOverriddenByTenantContextAndSensitiveFieldsNeverLeaveService(Storage storage) throws Exception {
        var f = fixture(storage); f.ready("tenant-a", "vendor", "model");
        f.ready("tenant-b", "other", "other-model"); CurrentTenantContext.set("tenant-b");
        var catalog = f.service().catalog(null);
        assertEquals(List.of("vendor"), catalog.providers().stream().map(p -> p.providerCode()).toList());
        assertEquals("tenant-b", CurrentTenantContext.getTenantIdOrNull());
        String json = JsonUtil.toJson(catalog);
        for (String field : List.of("endpoint", "credential", "secret", "fingerprint", "providerModelCode", "priority", "weight", "\"id\"", "upstream-private-model")) {
            assertFalse(json.toLowerCase().contains(field.toLowerCase()), field);
        }
        CurrentUserContext.clear();
        assertEquals(401, assertThrows(BusinessException.class, () -> f.service().catalog(null)).getCode());
        CurrentUserContext.set(new CurrentUser(null, "partial", "tenant-a", Set.of()));
        assertEquals(401, assertThrows(BusinessException.class, () -> f.service().catalog(null)).getCode());
        f.login("tenant-a");
        assertEquals(400, assertThrows(BusinessException.class, () -> f.service().catalog(new PublicModelCatalogQuery(0L))).getCode());
        assertEquals(400, assertThrows(BusinessException.class, () -> f.service().catalog(new PublicModelCatalogQuery(-1L))).getCode());
    }
}
