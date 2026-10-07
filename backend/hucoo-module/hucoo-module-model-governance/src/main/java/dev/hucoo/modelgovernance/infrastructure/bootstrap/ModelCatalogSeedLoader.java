package dev.hucoo.modelgovernance.infrastructure.bootstrap;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.application.service.ModelDefinitionApplicationService;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.entity.LogicalModel;
import dev.hucoo.modelgovernance.domain.entity.ModelChannel;
import dev.hucoo.modelgovernance.domain.entity.ModelChannelBinding;
import dev.hucoo.modelgovernance.domain.entity.ModelChannelPrice;
import dev.hucoo.modelgovernance.domain.entity.ModelDefinition;
import dev.hucoo.modelgovernance.domain.entity.ModelProvider;
import dev.hucoo.modelgovernance.domain.entity.ModelVersion;
import dev.hucoo.modelgovernance.domain.entity.ModelVersionCapability;
import jakarta.annotation.PostConstruct;

/**
 * Mock 模式启动时装载供应商与模型目录基线数据。
 *
 * <p>persistence.enabled=false 时数据库不参与，{@code InMemoryModelCatalogRepository} 初始为空，
 * 供应商、渠道、逻辑模型、版本、能力、映射与价格接口都会返回空列表，不利于本地联调与前端对接。
 * 这里在容器启动时把 {@code model-catalog/model-catalog-seed.json} 中的平台级目录写入内存仓储，
 * 与 Flyway 迁移 {@code V15__seed_model_catalog.sql} 同源同内容。
 *
 * <p>数据归属系统租户 {@link PlatformConstants#SYSTEM_TENANT_ID}，装载完成后恢复原租户上下文。
 * 只在内存仓储为空时装载，重复启动或已人工写入配置的环境不会被覆盖。
 */
@Component
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class ModelCatalogSeedLoader {

    private static final Logger log = LoggerFactory.getLogger(ModelCatalogSeedLoader.class);

    private static final String SEED_RESOURCE = "model-catalog/model-catalog-seed.json";
    private static final String PUBLISHED = "PUBLISHED";
    private static final String ACTIVE = "ACTIVE";

    private final ModelCatalogRepository repository;
    private final ModelDefinitionApplicationService modelDefinitionService;

    public ModelCatalogSeedLoader(ModelCatalogRepository repository,
                                  ModelDefinitionApplicationService modelDefinitionService) {
        this.repository = repository;
        this.modelDefinitionService = modelDefinitionService;
    }

    @PostConstruct
    public void load() {
        Catalog catalog = readCatalog();
        if (catalog == null || catalog.providers() == null || catalog.models() == null) {
            log.warn("模型目录基线数据未加载：{} 缺失或格式不正确", SEED_RESOURCE);
            return;
        }
        String previousTenant = CurrentTenantContext.getTenantIdOrNull();
        CurrentTenantContext.set(PlatformConstants.SYSTEM_TENANT_ID);
        try {
            if (!repository.list(ModelProvider.class).isEmpty()) {
                log.info("模型目录基线数据已存在，跳过装载");
                return;
            }
            Map<String, String> providerEndpoints = new HashMap<>();
            Map<String, Long> channelIds = saveProviders(catalog.providers(), providerEndpoints);
            Map<String, Long> versionIds = saveModels(catalog.models());
            int bindings = saveBindings(catalog.bindings(), channelIds, versionIds, catalog.models());
            saveLegacyModelDefinitions(catalog.models(), providerEndpoints);
            log.info("模型目录基线数据装载完成：{} 家供应商 / {} 个渠道 / {} 个逻辑模型 / {} 条渠道映射",
                    catalog.providers().size(), channelIds.size(), versionIds.size(), bindings);
        } catch (RuntimeException error) {
            log.error("模型目录基线数据装载失败，Mock 模式将只提供空目录", error);
        } finally {
            if (previousTenant == null) {
                CurrentTenantContext.clear();
            } else {
                CurrentTenantContext.set(previousTenant);
            }
        }
    }

    private Catalog readCatalog() {
        try {
            String json = new ClassPathResource(SEED_RESOURCE).getContentAsString(StandardCharsets.UTF_8);
            return JsonUtil.parse(json, Catalog.class);
        } catch (Exception error) {
            log.warn("读取模型目录基线数据失败：{}", error.getMessage());
            return null;
        }
    }

    private Map<String, Long> saveProviders(List<Provider> providers, Map<String, String> providerEndpoints) {
        Map<String, Long> channelIds = new HashMap<>();
        for (Provider provider : providers) {
            ModelProvider entity = new ModelProvider();
            entity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
            entity.setProviderCode(provider.providerCode());
            entity.setProviderName(provider.providerName());
            entity.setEndpoint(provider.endpoint());
            entity.setProviderType(provider.providerType());
            entity.setWebsite(provider.website());
            entity.setDocumentationUrl(provider.documentationUrl());
            entity.setDefaultRegion(provider.defaultRegion());
            entity.setComplianceLevel(provider.complianceLevel());
            entity.setDescription(provider.description());
            entity.setApprovalStatus(PUBLISHED);
            entity.setStatus(1);
            Long providerId = repository.save(entity).getId();
            providerEndpoints.put(provider.providerCode(), provider.endpoint());

            for (Channel channel : nullSafe(provider.channels())) {
                ModelChannel channelEntity = new ModelChannel();
                channelEntity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
                channelEntity.setProviderId(providerId);
                channelEntity.setChannelCode(channel.channelCode());
                channelEntity.setChannelName(channel.channelName());
                channelEntity.setProtocolType(channel.protocolType());
                channelEntity.setEndpoint(channel.endpoint());
                channelEntity.setBasePath(channel.basePath());
                channelEntity.setRegion(channel.region());
                channelEntity.setNetworkZone(channel.networkZone());
                channelEntity.setAuthType(channel.authType() == null ? "API_KEY" : channel.authType());
                channelEntity.setProtocolConfigJson(JsonUtil.toJson(channel.protocolConfigJson()));
                channelEntity.setRequestTimeoutMs(channel.requestTimeoutMs() == null ? 30000L : channel.requestTimeoutMs());
                channelEntity.setStreamTimeoutMs(channel.streamTimeoutMs() == null ? 60000L : channel.streamTimeoutMs());
                channelEntity.setStatus(channel.status() == null ? ACTIVE : channel.status());
                channelEntity.setApprovalStatus(PUBLISHED);
                channelEntity.setHealthStatus(channel.healthStatus() == null ? "UNKNOWN" : channel.healthStatus());
                channelIds.put(channelKey(provider.providerCode(), channel.channelCode()),
                        repository.save(channelEntity).getId());
            }
        }
        return channelIds;
    }

    private Map<String, Long> saveModels(List<Model> models) {
        Map<String, Long> versionIds = new HashMap<>();
        for (Model model : models) {
            LogicalModel entity = new LogicalModel();
            entity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
            entity.setModelCode(model.modelCode());
            entity.setModelName(model.modelName());
            entity.setModelFamily(model.modelFamily());
            entity.setModelType(model.modelType());
            entity.setSourceType(model.sourceType() == null ? "PLATFORM" : model.sourceType());
            entity.setLifecycleStatus(PUBLISHED);
            entity.setDescription(model.description());
            entity.setMetadataJson(JsonUtil.toJson(model.metadataJson()));
            Long modelId = repository.save(entity).getId();

            Version version = model.version();
            if (version == null) {
                continue;
            }
            ModelVersion versionEntity = new ModelVersion();
            versionEntity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
            versionEntity.setModelId(modelId);
            versionEntity.setVersionCode(version.versionCode());
            versionEntity.setContextWindow(version.contextWindow());
            versionEntity.setMaxInputTokens(version.maxInputTokens());
            versionEntity.setMaxOutputTokens(version.maxOutputTokens());
            versionEntity.setInputModalitiesJson(JsonUtil.toJson(
                    version.inputModalities() == null ? List.of("text") : version.inputModalities()));
            versionEntity.setOutputModalitiesJson(JsonUtil.toJson(
                    version.outputModalities() == null ? List.of("text") : version.outputModalities()));
            versionEntity.setDefaultParametersJson(JsonUtil.toJson(version.defaultParameters()));
            versionEntity.setReleaseStatus(PUBLISHED);
            versionEntity.setReleasedAt(parseDate(version.releasedAt()));
            versionEntity.setDeprecatedAt(parseDate(version.deprecatedAt()));
            Long versionId = repository.save(versionEntity).getId();
            versionIds.put(model.modelCode(), versionId);

            for (Capability capability : nullSafe(model.capabilities())) {
                ModelVersionCapability capabilityEntity = new ModelVersionCapability();
                capabilityEntity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
                capabilityEntity.setModelVersionId(versionId);
                capabilityEntity.setCapabilityCode(capability.capabilityCode());
                capabilityEntity.setSupported(capability.supported() == null ? 1 : capability.supported());
                capabilityEntity.setConstraintJson(JsonUtil.toJson(capability.constraintJson()));
                repository.save(capabilityEntity);
            }
        }
        return versionIds;
    }

    private int saveBindings(List<Binding> bindings, Map<String, Long> channelIds, Map<String, Long> versionIds,
                             List<Model> models) {
        Map<String, String> releasedAt = new HashMap<>();
        for (Model model : models) {
            if (model.version() != null) {
                releasedAt.put(model.modelCode(), model.version().releasedAt());
            }
        }
        int count = 0;
        for (Binding binding : nullSafe(bindings)) {
            Long channelId = channelIds.get(channelKey(binding.providerCode(), binding.channelCode()));
            Long versionId = versionIds.get(binding.modelCode());
            if (channelId == null || versionId == null) {
                log.warn("跳过无法解析渠道或版本的映射：{}", binding.bindingKey());
                continue;
            }
            ModelChannelBinding entity = new ModelChannelBinding();
            entity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
            entity.setModelVersionId(versionId);
            entity.setChannelId(channelId);
            entity.setProviderModelCode(binding.providerModelCode());
            entity.setModelAlias(binding.modelAlias());
            entity.setDefaultWeight(binding.defaultWeight() == null ? 1 : binding.defaultWeight());
            entity.setPriority(binding.priority() == null ? 0 : binding.priority());
            entity.setMaxConcurrency(binding.maxConcurrency() == null ? 0 : binding.maxConcurrency());
            entity.setStatus(ACTIVE);
            entity.setApprovalStatus(PUBLISHED);
            Long bindingId = repository.save(entity).getId();
            count++;

            LocalDateTime effectiveFrom = parseDate(releasedAt.get(binding.modelCode()));
            for (Price price : nullSafe(binding.prices())) {
                ModelChannelPrice priceEntity = new ModelChannelPrice();
                priceEntity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
                priceEntity.setBindingId(bindingId);
                priceEntity.setBillingDimension(price.billingDimension());
                priceEntity.setTierStart(price.tierStart() == null ? 0L : price.tierStart());
                priceEntity.setTierEnd(price.tierEnd());
                priceEntity.setUnitPrice(price.unitPrice() == null ? BigDecimal.ZERO : price.unitPrice());
                priceEntity.setUnitScale(price.unitScale() == null ? 1000000L : price.unitScale());
                priceEntity.setCurrency(price.currency() == null ? "USD" : price.currency());
                priceEntity.setEffectiveFrom(effectiveFrom == null ? LocalDateTime.now() : effectiveFrom);
                repository.save(priceEntity);
            }
        }
        return count;
    }

    /**
     * 旧的 {@code ap_model_definition} 影子表仍由 {@code /api/admin/v1/models} 提供分页查询，
     * 这里用同一份目录填充，避免管理端同时看到真实目录与占位示例数据。
     */
    private void saveLegacyModelDefinitions(List<Model> models, Map<String, String> providerEndpoints) {
        for (Model model : models) {
            ModelDefinition entity = new ModelDefinition();
            entity.setModelCode(model.modelCode());
            entity.setModelName(model.modelName());
            entity.setProvider(model.vendorProviderCode());
            entity.setModelType(model.modelType());
            entity.setEndpoint(providerEndpoints.get(model.vendorProviderCode()));
            entity.setStatus(1);
            modelDefinitionService.save(entity);
        }
    }

    private String channelKey(String providerCode, String channelCode) {
        return providerCode + ":" + channelCode;
    }

    private static LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value).atStartOfDay();
        } catch (RuntimeException error) {
            return null;
        }
    }

    private static <T> List<T> nullSafe(List<T> values) {
        return values == null ? List.of() : values;
    }

    // ------------------------------------------------------------ 种子文件结构

    /**
     * 与 model-catalog/model-catalog-seed.json 一一对应的只读结构。
     */
    public record Catalog(String catalogVersion, String currency, Long unitScale, String source,
                          List<Provider> providers, List<Model> models, List<Binding> bindings) {
    }

    public record Provider(String providerCode, String providerName, String providerType, String endpoint,
                           String website, String documentationUrl, String defaultRegion, String complianceLevel,
                           String description, List<Channel> channels) {
    }

    public record Channel(String channelCode, String channelName, String protocolType, String endpoint,
                          String basePath, String region, String networkZone, String authType,
                          Object protocolConfigJson, Long requestTimeoutMs, Long streamTimeoutMs,
                          String status, String healthStatus) {
    }

    public record Model(String modelCode, String vendorProviderCode, String modelName, String modelFamily,
                        String modelType, String sourceType, String description, Object metadataJson,
                        Version version, List<Capability> capabilities) {
    }

    public record Version(String versionCode, Long contextWindow, Long maxInputTokens, Long maxOutputTokens,
                          List<String> inputModalities, List<String> outputModalities, Object defaultParameters,
                          String releasedAt, String deprecatedAt) {
    }

    public record Capability(String capabilityCode, Integer supported, Object constraintJson) {
    }

    public record Binding(String providerCode, String channelCode, String bindingKey, String modelCode,
                          String providerModelCode, String modelAlias, Integer defaultWeight, Integer priority,
                          Integer maxConcurrency, List<Price> prices) {
    }

    public record Price(String billingDimension, Long tierStart, Long tierEnd, BigDecimal unitPrice,
                        Long unitScale, String currency) {
    }
}
