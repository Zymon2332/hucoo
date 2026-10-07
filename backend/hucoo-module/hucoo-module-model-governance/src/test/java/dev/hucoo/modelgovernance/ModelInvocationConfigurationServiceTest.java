package dev.hucoo.modelgovernance;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Base64;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.modelgovernance.application.service.ModelInvocationConfigurationService;
import dev.hucoo.modelgovernance.client.ModelInvocationConfigurationFacade.Context;
import dev.hucoo.modelgovernance.config.ModelVaultProperties;
import dev.hucoo.modelgovernance.domain.StableModelCatalogPolicy;
import dev.hucoo.modelgovernance.infrastructure.repository.InMemoryModelCatalogRepository;
import dev.hucoo.modelgovernance.infrastructure.secret.ModelCredentialCipher;

class ModelInvocationConfigurationServiceTest {
    enum Storage { MEMORY, MYBATIS }
    private CatalogTestDatabase database;

    @AfterEach void cleanup() {
        CurrentTenantContext.clear(); CurrentUserContext.clear();
        if (database != null) database.close();
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void decryptsOnlyAuthorizedPublishedRoutesAndMapsUpstreamProtocol(Storage storage) throws Exception {
        var repository = storage == Storage.MEMORY ? new InMemoryModelCatalogRepository()
                : (database = new CatalogTestDatabase()).repository;
        var fixture = new CatalogTestFixture(repository);
        var parts = fixture.ready("000000", "vendor", "public-model");
        fixture.ready("tenant-b", "other-vendor", "other-model");
        var properties = new ModelVaultProperties();
        properties.getKeys().put("v1", Base64.getEncoder().encodeToString(new byte[32]));
        var cipher = new ModelCredentialCipher(properties, true);
        cipher.encrypt(parts.credential(), "test-only-key");
        fixture.save(parts.credential());
        parts.channel().setBasePath("/zen/go/v1"); fixture.save(parts.channel());
        parts.binding().setMaxConcurrency(2); fixture.save(parts.binding());
        parts.target().setMaxConcurrency(4); fixture.save(parts.target());
        var service = new ModelInvocationConfigurationService(repository, cipher, new StableModelCatalogPolicy());
        var context = new Context("tenant-a", 42L, null, "public-model", CatalogTestFixture.NOW);
        // 新生服务也能读取密文，配置不依赖运行时内存账户。
        var route = service.resolve(context).getFirst();
        assertEquals("https://secret.example.com/zen/go/v1", route.endpoint());
        assertEquals("upstream-private-model", route.providerModelCode());
        assertEquals("openai-compatible", route.protocol());
        assertEquals(2, route.maxConcurrency());
        assertEquals("test-only-key", route.credential().get());
        assertFalse(route.toString().contains("test-only-key"));
        assertTrue(service.resolve(new Context("tenant-a", 42L, null, "other-model", CatalogTestFixture.NOW)).isEmpty());
        fixture.grant(parts, "TENANT", "tenant-a", "DENY");
        assertTrue(service.resolve(context).isEmpty());
        assertEquals(1, service.resolve(new Context("tenant-c", 42L, null, "public-model", CatalogTestFixture.NOW)).size());
        parts.target().setStatus("DISABLED"); fixture.save(parts.target());
        assertTrue(service.resolve(new Context("tenant-c", 42L, null, "public-model", CatalogTestFixture.NOW)).isEmpty());
    }

    @ParameterizedTest @EnumSource(Storage.class)
    void refusesDraftFailedValidationExpiredCredentialAndNarrowerDisabledRoute(Storage storage) throws Exception {
        var repository = storage == Storage.MEMORY ? new InMemoryModelCatalogRepository()
                : (database = new CatalogTestDatabase()).repository;
        var fixture = new CatalogTestFixture(repository);
        var p = fixture.ready("tenant-a", "vendor", "model");
        var service = new ModelInvocationConfigurationService(repository, new ModelCredentialCipher(new ModelVaultProperties(), false),
                new StableModelCatalogPolicy());
        var c = new Context("tenant-a", 42L, 7L, "model", CatalogTestFixture.NOW);
        p.version().setReleaseStatus("DRAFT"); fixture.save(p.version());
        assertTrue(service.resolve(c).isEmpty());
        p.version().setReleaseStatus("PUBLISHED"); fixture.save(p.version());
        p.validation().setStatus("FAILED"); fixture.save(p.validation());
        assertTrue(service.resolve(c).isEmpty());
        p.validation().setStatus("PASSED"); fixture.save(p.validation());
        p.credential().setExpiresAt(CatalogTestFixture.NOW); fixture.save(p.credential());
        assertTrue(service.resolve(c).isEmpty());
        p.credential().setExpiresAt(null); fixture.save(p.credential());
        var route = new dev.hucoo.modelgovernance.domain.entity.ModelRoutePolicy();
        route.setTenantId("tenant-a"); route.setModelId(p.model().getId()); route.setScopeType("PROJECT");
        route.setScopeId("7"); route.setEnabled(1); fixture.save(route);
        assertTrue(service.resolve(c).isEmpty());
        assertEquals(1, service.resolve(new Context("tenant-a", 42L, 8L, "model", CatalogTestFixture.NOW)).size());
        assertThrows(dev.hucoo.commons.exception.BusinessException.class,
                () -> service.resolve(new Context("tenant-a", null, null, "model", CatalogTestFixture.NOW)));
    }
}
