package dev.hucoo.modelgovernance;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import org.mapstruct.factory.Mappers;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.modelgovernance.application.converter.PublicModelCatalogConverter;
import dev.hucoo.modelgovernance.application.service.PublicModelCatalogApplicationService;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.ModelCatalogReleasePolicy;
import dev.hucoo.modelgovernance.domain.StableModelCatalogPolicy;
import dev.hucoo.modelgovernance.domain.entity.*;

final class CatalogTestFixture {
    static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-07T08:00:00Z"), ZoneOffset.UTC);
    static final LocalDateTime NOW = LocalDateTime.now(CLOCK);
    final ModelCatalogRepository repository;

    CatalogTestFixture(ModelCatalogRepository repository) { this.repository = repository; }

    void login(String tenant) {
        CurrentTenantContext.set(tenant);
        CurrentUserContext.set(new CurrentUser(42L, "client", tenant, Set.of()));
    }

    PublicModelCatalogApplicationService service() { return service(new StableModelCatalogPolicy()); }

    PublicModelCatalogApplicationService service(ModelCatalogReleasePolicy policy) {
        return new PublicModelCatalogApplicationService(repository,
                Mappers.getMapper(PublicModelCatalogConverter.class), policy, CLOCK);
    }

    <T extends BaseEntity> T save(T entity) {
        String previous = CurrentTenantContext.getTenantIdOrNull();
        CurrentTenantContext.set(entity.getTenantId());
        try { return repository.save(entity); }
        finally {
            if (previous == null) CurrentTenantContext.clear(); else CurrentTenantContext.set(previous);
        }
    }

    ModelVisibilityGrant grant(Parts parts, String type, String id, String effect) {
        ModelVisibilityGrant grant = new ModelVisibilityGrant();
        grant.setTenantId(parts.model().getTenantId()); grant.setModelId(parts.model().getId());
        grant.setScopeType(type); grant.setScopeId(id); grant.setEffect(effect);
        return save(grant);
    }

    Parts ready(String tenant, String providerCode, String modelCode) {
        ModelProvider provider = new ModelProvider();
        provider.setTenantId(tenant); provider.setProviderCode(providerCode); provider.setProviderName(providerCode);
        provider.setApprovalStatus("PUBLISHED"); provider.setStatus(1); provider.setEndpoint("https://secret.example.com");
        save(provider);
        ModelChannel channel = new ModelChannel();
        channel.setTenantId(tenant); channel.setProviderId(provider.getId()); channel.setChannelCode("primary");
        channel.setChannelName("Primary"); channel.setProtocolType("OPENAI_COMPATIBLE");
        channel.setEndpoint("https://secret.example.com"); channel.setAuthType("API_KEY");
        channel.setStatus("ACTIVE"); channel.setApprovalStatus("PUBLISHED"); channel.setHealthStatus("HEALTHY");
        save(channel);
        LogicalModel model = new LogicalModel();
        model.setTenantId(tenant); model.setModelCode(modelCode); model.setModelName(modelCode);
        model.setModelFamily("Test"); model.setModelType("CHAT"); model.setSourceType("PLATFORM");
        model.setLifecycleStatus("PUBLISHED"); save(model);
        ModelVersion version = new ModelVersion();
        version.setTenantId(tenant); version.setModelId(model.getId()); version.setVersionCode("v1");
        version.setReleaseStatus("PUBLISHED"); version.setReleasedAt(NOW.minusDays(1));
        version.setContextWindow(8192L); version.setInputModalitiesJson("[\"text\",\"image\"]");
        version.setOutputModalitiesJson("[\"text\"]"); save(version);
        ModelChannelBinding binding = new ModelChannelBinding();
        binding.setTenantId(tenant); binding.setModelVersionId(version.getId()); binding.setChannelId(channel.getId());
        binding.setProviderModelCode("upstream-private-model"); binding.setStatus("ACTIVE");
        binding.setApprovalStatus("PUBLISHED"); binding.setDefaultWeight(1); save(binding);
        ModelValidationRun validation = new ModelValidationRun();
        validation.setTenantId(tenant); validation.setModelVersionId(version.getId());
        validation.setBindingId(binding.getId()); validation.setStatus("PASSED"); save(validation);
        binding.setLastValidationRunId(validation.getId()); save(binding);
        ModelCredential credential = new ModelCredential();
        credential.setTenantId(tenant); credential.setChannelId(channel.getId()); credential.setCredentialName("Test");
        credential.setCredentialType("API_KEY"); credential.setOwnerScopeType("PLATFORM");
        credential.setStatus("ACTIVE"); credential.setSecretCiphertext("test-ciphertext");
        credential.setSecretFingerprint("private-fingerprint"); credential.setExpiresAt(NOW.plusDays(1)); save(credential);
        ModelRoutePolicy route = new ModelRoutePolicy();
        route.setTenantId(tenant); route.setModelId(model.getId()); route.setModelCode(modelCode);
        route.setScopeType("PLATFORM"); route.setScopeId(""); route.setEnabled(1); save(route);
        ModelRouteTarget target = new ModelRouteTarget();
        target.setTenantId(tenant); target.setBindingId(binding.getId()); target.setRoutePolicyId(route.getId());
        target.setCredentialId(credential.getId()); target.setConfiguredWeight(1); target.setStatus("ACTIVE"); save(target);
        ModelVersionCapability capability = new ModelVersionCapability();
        capability.setTenantId(tenant); capability.setModelVersionId(version.getId());
        capability.setCapabilityCode("STREAMING"); capability.setSupported(1); save(capability);
        Parts parts = new Parts(provider, channel, model, version, binding, validation, credential, route, target);
        grant(parts, "PLATFORM", "", "ALLOW");
        return parts;
    }

    record Parts(ModelProvider provider, ModelChannel channel, LogicalModel model, ModelVersion version,
                 ModelChannelBinding binding, ModelValidationRun validation, ModelCredential credential,
                 ModelRoutePolicy route, ModelRouteTarget target) { }
}
