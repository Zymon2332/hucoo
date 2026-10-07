package dev.hucoo.modelgovernance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.api.dto.ModelChannelDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.api.dto.ModelProviderDTO;
import dev.hucoo.modelgovernance.application.converter.ModelCatalogConverter;
import dev.hucoo.modelgovernance.application.converter.ModelDefinitionConverter;
import dev.hucoo.modelgovernance.application.service.ModelCatalogApplicationService;
import dev.hucoo.modelgovernance.application.service.ModelProviderChannelService;
import dev.hucoo.modelgovernance.application.service.mock.MockModelDefinitionApplicationService;
import dev.hucoo.modelgovernance.config.ModelVaultProperties;
import dev.hucoo.modelgovernance.domain.entity.LogicalModel;
import dev.hucoo.modelgovernance.domain.entity.ModelChannel;
import dev.hucoo.modelgovernance.domain.entity.ModelChannelBinding;
import dev.hucoo.modelgovernance.domain.entity.ModelProvider;
import dev.hucoo.modelgovernance.domain.entity.ModelVersion;
import dev.hucoo.modelgovernance.domain.entity.ModelVersionCapability;
import dev.hucoo.modelgovernance.infrastructure.bootstrap.ModelCatalogSeedLoader;
import dev.hucoo.modelgovernance.infrastructure.repository.InMemoryModelCatalogRepository;
import dev.hucoo.modelgovernance.infrastructure.secret.ModelCredentialCipher;

/**
 * 验证 Mock 模式下市面知名供应商与模型目录基线数据可被接口正常读取。
 */
class ModelCatalogSeedLoaderTest {

    private InMemoryModelCatalogRepository repository;
    private MockModelDefinitionApplicationService legacy;
    private ModelCatalogSeedLoader loader;
    private ModelCatalogApplicationService catalog;
    private ModelProviderChannelService providers;

    @BeforeEach
    void setUp() {
        repository = new InMemoryModelCatalogRepository();
        ModelCatalogConverter converter = Mappers.getMapper(ModelCatalogConverter.class);
        legacy = new MockModelDefinitionApplicationService(Mappers.getMapper(ModelDefinitionConverter.class));
        loader = new ModelCatalogSeedLoader(repository, legacy);
        catalog = new ModelCatalogApplicationService(repository, converter,
                new ModelCredentialCipher(new ModelVaultProperties(), false));
        providers = new ModelProviderChannelService(repository, converter);
        loader.load();
    }

    @AfterEach
    void clearTenant() {
        CurrentTenantContext.clear();
    }

    @Test
    void loadsWellKnownProvidersAndModelsForTheSystemTenant() {
        ModelDefinitionQueryRequest query = new ModelDefinitionQueryRequest();
        query.setPageSize(500L);

        assertTrue(providers.pageProviders(query).getTotal() >= 20, "应装载市面主流供应商");
        assertEquals(25, providers.pageProviders(query).getTotal());
        assertEquals(96, catalog.models(query).getTotal());
        assertEquals(96, repository.list(ModelVersion.class).size());
        assertEquals(115, repository.list(ModelChannelBinding.class).size());
        assertTrue(repository.list(ModelVersionCapability.class).size() > 500);
        assertFalse(repository.list(ModelProvider.class).isEmpty());
    }

    @Test
    void exposesRealProviderMetadataAndChannelEndpoints() {
        ModelDefinitionQueryRequest query = new ModelDefinitionQueryRequest();
        ModelProviderDTO openai = providers.pageProviders(query).getItems().stream()
                .filter(provider -> "openai".equals(provider.getProviderCode())).findFirst().orElseThrow();
        assertEquals("OpenAI", openai.getProviderName());
        assertEquals("OFFICIAL", openai.getProviderType());
        assertEquals("PUBLISHED", openai.getApprovalStatus());
        assertEquals("https://api.openai.com", openai.getEndpoint());

        ModelChannelDTO channel = providers.pageChannels(openai.getId(), query).getItems().get(0);
        assertEquals("openai-primary", channel.getChannelCode());
        assertEquals("OPENAI_COMPATIBLE", channel.getProtocolType());
        assertEquals("PUBLISHED", channel.getApprovalStatus());
        assertTrue(channel.getProtocolConfigJson().contains("schemaVersion"), "协议配置必须包含 schemaVersion");
        assertFalse(channel.getProtocolConfigJson().toLowerCase().contains("apikey"), "协议配置不得保存密钥");
    }

    @Test
    void keepsModelDefinitionsFreeOfPlaceholderSamples() {
        ModelDefinitionQueryRequest query = new ModelDefinitionQueryRequest();
        query.setPageSize(500L);
        var page = legacy.pageDtos(query);
        assertEquals(96, page.getTotal());
        assertTrue(page.getItems().stream().noneMatch(item -> item.getModelName().startsWith("示例数据")));
        assertTrue(page.getItems().stream().anyMatch(item -> "gpt-6.1-sol-pro".equals(item.getModelCode())));
    }

    @Test
    void seededCatalogStaysInvisibleToOtherTenants() {
        CurrentTenantContext.set("tenant-a");
        ModelDefinitionQueryRequest query = new ModelDefinitionQueryRequest();
        assertEquals(0, providers.pageProviders(query).getTotal());
        assertEquals(0, catalog.models(query).getTotal());
        assertNotNull(PlatformConstants.SYSTEM_TENANT_ID);
    }

    @Test
    void loadingTwiceDoesNotDuplicateTheCatalog() {
        loader.load();
        assertEquals(25, repository.list(ModelProvider.class).size());
        assertEquals(96, repository.list(LogicalModel.class).size());
    }
}
