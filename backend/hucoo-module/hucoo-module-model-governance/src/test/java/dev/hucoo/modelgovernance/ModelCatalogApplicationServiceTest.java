package dev.hucoo.modelgovernance;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.application.converter.ModelCatalogConverter;
import dev.hucoo.modelgovernance.application.service.*;
import dev.hucoo.modelgovernance.config.ModelVaultProperties;
import dev.hucoo.modelgovernance.domain.entity.*;
import dev.hucoo.modelgovernance.infrastructure.repository.InMemoryModelCatalogRepository;
import dev.hucoo.modelgovernance.infrastructure.secret.ModelCredentialCipher;

class ModelCatalogApplicationServiceTest {
    private InMemoryModelCatalogRepository repository;
    private ModelCatalogApplicationService catalog;
    private ModelProviderChannelService providers;
    private ModelRouteConfigurationService routes;
    private ModelCredentialCipher cipher;
    private Long providerId, channelId, modelId, versionId, bindingId;

    @BeforeEach
    void setUp() {
        CurrentTenantContext.set("tenant-a");
        repository = new InMemoryModelCatalogRepository();
        ModelCatalogConverter converter = Mappers.getMapper(ModelCatalogConverter.class);
        cipher = new ModelCredentialCipher(new ModelVaultProperties(), false);
        catalog = new ModelCatalogApplicationService(repository, converter, cipher);
        providers = new ModelProviderChannelService(repository, converter);
        routes = new ModelRouteConfigurationService(repository, converter);
        ModelProviderCreateRequest provider = new ModelProviderCreateRequest();
        provider.setProviderCode("test-provider"); provider.setProviderName("供应商"); provider.setWebsite("https://example.com");
        providerId = providers.createProvider(provider).getId();
        channelId = providers.createChannel(providerId, channelRequest("primary")).getId();
        LogicalModelCreateRequest model = modelRequest("test-model");
        modelId = catalog.createModel(model).getId();
        ModelVersionCreateRequest version = new ModelVersionCreateRequest();
        version.setVersionCode("v1"); version.setContextWindow(8192L); version.setMaxOutputTokens(1024L);
        versionId = catalog.createVersion(modelId, version).getId();
        ModelChannelBindingCreateRequest binding = new ModelChannelBindingCreateRequest();
        binding.setChannelId(channelId); binding.setProviderModelCode("provider-model-v1");
        bindingId = catalog.createBinding(versionId, binding).getId();
    }

    @AfterEach void clearTenant() { CurrentTenantContext.clear(); }

    @Test
    void mockCrudRetainsProviderChannelFieldsAndAppliesPagination() {
        providers.createChannel(providerId, channelRequest("secondary"));
        ModelDefinitionQueryRequest query = new ModelDefinitionQueryRequest();
        assertEquals(2, providers.pageChannels(providerId, query).getTotal());
        assertEquals("https://example.com", providers.pageProviders(query).getItems().get(0).getWebsite());
        assertEquals(providerId, providers.updateChannel(channelId, channelRequest("updated")).getProviderId());
        assertEquals("PENDING_APPROVAL", providers.pageChannels(providerId, query).getItems().get(0).getApprovalStatus());
    }

    @Test
    void tenantCannotReadUpdateOrReferenceAnotherTenantsResources() {
        CurrentTenantContext.set("tenant-b");
        assertEquals(0, catalog.models(new ModelDefinitionQueryRequest()).getTotal());
        assertThrows(ResourceNotFoundException.class, () -> catalog.model(modelId));
        assertThrows(ResourceNotFoundException.class, () -> catalog.updateModel(modelId, modelRequest("stolen")));
        assertThrows(ResourceNotFoundException.class, () -> providers.createChannel(providerId, channelRequest("stolen")));
    }

    @Test
    void duplicateModelCodesAreRejectedWithinTenantAndAllowedAcrossTenants() {
        assertThrows(BusinessException.class, () -> catalog.createModel(modelRequest("test-model")));
        CurrentTenantContext.set("tenant-b");
        assertNotNull(catalog.createModel(modelRequest("test-model")).getId());
    }

    @Test
    void validatesProtocolJsonAndRejectsInlineSecrets() {
        ModelChannelCreateRequest request = channelRequest("bad-json");
        request.setProtocolConfigJson("{\"temperature\":1}");
        assertThrows(BusinessException.class, () -> providers.createChannel(providerId, request));
        request.setProtocolConfigJson("{\"schemaVersion\":1,\"headers\":{\"Authorization\":\"secret\"}}");
        assertThrows(BusinessException.class, () -> providers.createChannel(providerId, request));
        request.setProtocolConfigJson("{\"schemaVersion\":1}");
        request.setEndpoint("https://user:password@example.com");
        assertThrows(BusinessException.class, () -> providers.createChannel(providerId, request));
        request.setEndpoint("api.example.com");
        assertThrows(BusinessException.class, () -> providers.createChannel(providerId, request));
    }

    @Test
    void configurationChangesInvalidateApprovalAndVersionRelease() {
        catalog.approve("providers", providerId);
        catalog.approve("channels", channelId);
        catalog.approve("models", modelId);
        catalog.approve("versions", versionId);
        catalog.approve("bindings", bindingId);
        assertEquals("PUBLISHED", catalog.bindings(versionId).get(0).getApprovalStatus());
        providers.updateChannel(channelId, channelRequest("primary"));
        assertThrows(BusinessException.class, () -> catalog.approve("bindings", bindingId));
        ModelVersionCapabilityCreateRequest capability = new ModelVersionCapabilityCreateRequest();
        capability.setCapabilityCode("TOOL_CALLING"); capability.setSupported(1);
        catalog.setCapability(versionId, capability);
        assertEquals("DRAFT", catalog.versions(modelId).get(0).getReleaseStatus());
    }

    @Test
    void rejectsPriceOverlapButAllowsNewEffectivePeriod() {
        ModelChannelPriceCreateRequest price = price(0, 100, "2026-01-01T00:00:00", "2026-06-01T00:00:00");
        catalog.createPrice(bindingId, price);
        assertThrows(BusinessException.class, () -> catalog.createPrice(bindingId, price(100, 200, "2026-05-01T00:00:00", "2026-07-01T00:00:00")));
        assertNotNull(catalog.createPrice(bindingId, price(0, 100, "2026-06-01T00:00:00", "2026-12-01T00:00:00")));
    }

    @Test
    void concurrentPriceCreationAllowsOnlyOneOverlappingInterval() throws Exception {
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Boolean> create = () -> {
                CurrentTenantContext.set("tenant-a");
                try {
                    start.await();
                    catalog.createPrice(bindingId, price(0, 100, "2026-01-01T00:00:00", "2026-12-01T00:00:00"));
                    return true;
                } catch (BusinessException conflict) {
                    return false;
                } finally {
                    CurrentTenantContext.clear();
                }
            };
            var first = executor.submit(create);
            var second = executor.submit(create);
            start.countDown();
            int successes = (first.get(5, java.util.concurrent.TimeUnit.SECONDS) ? 1 : 0)
                    + (second.get(5, java.util.concurrent.TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, successes);
            assertEquals(1, catalog.prices(bindingId).size());
        }
    }

    @Test
    void validatesContextWindowAndProtectsParentsWithReferences() {
        ModelVersionCreateRequest invalid = new ModelVersionCreateRequest();
        invalid.setVersionCode("bad"); invalid.setContextWindow(100L); invalid.setMaxOutputTokens(101L);
        assertThrows(BusinessException.class, () -> catalog.createVersion(modelId, invalid));
        assertThrows(BusinessException.class, () -> catalog.deleteModel(modelId));
        assertThrows(BusinessException.class, () -> providers.deleteProvider(providerId));
        assertThrows(BusinessException.class, () -> catalog.deleteVersion(versionId));
    }

    @Test
    void encryptsRotatesAndRevokesCredentialWithoutReturningSecret() {
        String secret = "super-secret-key";
        ModelCredentialDTO created = catalog.createCredential(channelId, credential(secret));
        ModelCredential stored = repository.find(ModelCredential.class, created.getId());
        assertNotEquals(secret, stored.getSecretCiphertext());
        assertEquals(secret, cipher.decrypt(stored));
        String dtoJson = JsonUtil.toJson(created);
        assertFalse(dtoJson.contains(secret)); assertFalse(dtoJson.contains("ciphertext")); assertFalse(dtoJson.contains("secretNonce"));
        ModelCredentialRotateRequest rotation = new ModelCredentialRotateRequest();
        rotation.setSecret("rotated-secret"); rotation.setReason("定期轮换");
        catalog.rotateCredential(created.getId(), rotation);
        assertEquals("rotated-secret", cipher.decrypt(repository.find(ModelCredential.class, created.getId())));
        assertEquals(1, repository.list(ModelCredentialRotation.class).size());
        assertEquals("REVOKED", catalog.revokeCredential(created.getId()).getStatus());
        assertThrows(BusinessException.class, () -> catalog.rotateCredential(created.getId(), rotation));
    }

    @Test
    void credentialCipherDetectsTamperingAndTenantChange() {
        ModelCredentialDTO created = catalog.createCredential(channelId, credential("secret"));
        ModelCredential stored = repository.find(ModelCredential.class, created.getId());
        stored.setTenantId("tenant-b");
        assertThrows(BusinessException.class, () -> cipher.decrypt(stored));
    }

    @Test
    void persistentVaultRequiresExplicitKeyAndSupportsOldVersions() {
        assertThrows(IllegalStateException.class, () -> new ModelCredentialCipher(new ModelVaultProperties(), true));
        ModelVaultProperties configured = new ModelVaultProperties();
        configured.getKeys().put("v1", java.util.Base64.getEncoder().encodeToString(new byte[32]));
        ModelCredentialCipher first = new ModelCredentialCipher(configured, true);
        ModelCredential stored = new ModelCredential(); stored.setChannelId(channelId); stored.setTenantId("tenant-a");
        first.encrypt(stored, "old-secret");
        configured.setActiveVersion("v2");
        configured.getKeys().put("v2", java.util.Base64.getEncoder().encodeToString(new byte[]{1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1}));
        assertEquals("old-secret", new ModelCredentialCipher(configured, true).decrypt(stored));
    }

    @Test
    void cannotBindCredentialFromAnotherChannelOrWrongModelVersion() {
        Long otherChannel = providers.createChannel(providerId, channelRequest("other")).getId();
        Long credentialId = catalog.createCredential(otherChannel, credential("other-secret")).getId();
        ModelRoutePolicyCreateRequest policyRequest = new ModelRoutePolicyCreateRequest();
        ModelRoutePolicyDTO policy = routes.createPolicy(modelId, policyRequest);
        ModelRouteTargetCreateRequest target = new ModelRouteTargetCreateRequest();
        target.setBindingId(bindingId); target.setCredentialId(credentialId);
        assertThrows(BusinessException.class, () -> routes.createTarget(policy.getId(), target));
        target.setCredentialId(catalog.createCredential(channelId, credential("right-secret")).getId());
        assertEquals("DISABLED", routes.createTarget(policy.getId(), target).getStatus());
        ModelChannelBindingCreateRequest changeChannel = new ModelChannelBindingCreateRequest();
        changeChannel.setChannelId(otherChannel); changeChannel.setProviderModelCode("other-model");
        assertThrows(BusinessException.class, () -> catalog.updateBinding(bindingId, changeChannel));
    }

    @Test
    void memoryTransactionRollsBackCredentialAndAuditTogether() {
        ModelCredentialDTO created = catalog.createCredential(channelId, credential("before"));
        assertThrows(IllegalStateException.class, () -> repository.inTransaction(() -> {
            ModelCredential changed = repository.find(ModelCredential.class, created.getId());
            cipher.encrypt(changed, "after"); repository.save(changed);
            throw new IllegalStateException("写审计失败");
        }));
        assertEquals("before", cipher.decrypt(repository.find(ModelCredential.class, created.getId())));
    }

    private LogicalModelCreateRequest modelRequest(String code) {
        LogicalModelCreateRequest request = new LogicalModelCreateRequest(); request.setModelCode(code); request.setModelName("模型"); request.setModelType("CHAT"); return request;
    }
    private ModelChannelCreateRequest channelRequest(String code) {
        ModelChannelCreateRequest request = new ModelChannelCreateRequest(); request.setChannelCode(code); request.setChannelName("渠道"); request.setProtocolType("OPENAI_COMPATIBLE"); request.setEndpoint("https://api.example.com"); request.setProtocolConfigJson("{\"schemaVersion\":1}"); return request;
    }
    private ModelCredentialCreateRequest credential(String secret) {
        ModelCredentialCreateRequest request = new ModelCredentialCreateRequest(); request.setCredentialName("访问凭证"); request.setSecret(secret); return request;
    }
    private ModelChannelPriceCreateRequest price(long start, long end, String from, String to) {
        ModelChannelPriceCreateRequest request = new ModelChannelPriceCreateRequest(); request.setBillingDimension("INPUT_TOKEN"); request.setTierStart(start); request.setTierEnd(end); request.setUnitPrice(new BigDecimal("1.25")); request.setEffectiveFrom(LocalDateTime.parse(from)); request.setEffectiveTo(LocalDateTime.parse(to)); return request;
    }
}
