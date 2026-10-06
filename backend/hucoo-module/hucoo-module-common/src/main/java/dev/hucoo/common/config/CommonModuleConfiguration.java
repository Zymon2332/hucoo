package dev.hucoo.common.config;

import java.util.List;
import java.util.Map;

import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import dev.hucoo.common.application.converter.CommonConverter;
import dev.hucoo.common.application.service.*;
import dev.hucoo.common.controller.*;
import dev.hucoo.common.domain.entity.*;
import dev.hucoo.common.infrastructure.mapper.*;
import dev.hucoo.common.infrastructure.repository.*;
import dev.hucoo.component.security.config.SecurityProperties;
import dev.hucoo.component.security.interceptor.PermissionResolver;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SecurityProperties.class)
public class CommonModuleConfiguration {
    private static final RecordDefinition TYPES = new RecordDefinition(
            Map.of("id", "id", "code", "dictionary_code", "name", "dictionary_name"), List.of("code", "name"), List.of("code"), List.of("id"));
    private static final RecordDefinition ITEMS = new RecordDefinition(
            Map.of("id", "id", "typeId", "type_id", "label", "item_label", "value", "item_value", "sortOrder", "sort_order"),
            List.of("label", "value"), List.of("typeId", "value"), List.of("sortOrder", "value"));
    private static final RecordDefinition CONFIGS = new RecordDefinition(
            Map.of("id", "id", "key", "config_key", "name", "config_name", "group", "config_group"),
            List.of("key", "name"), List.of("key"), List.of("key"));

    @Bean
    public CommonConverter commonConverter() {
        return Mappers.getMapper(CommonConverter.class);
    }

    @Bean
    public CommonAccess commonAccess(SecurityProperties security, ObjectProvider<PermissionResolver> permissions) {
        return new CommonAccess(security, permissions);
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
    static class Memory {
        @Bean
        public CommonRepository<DictionaryType> commonTypes() {
            return new MemoryCommonRepository<>(DictionaryType::new, TYPES);
        }

        @Bean
        public CommonRepository<DictionaryItem> commonItems() {
            return new MemoryCommonRepository<>(DictionaryItem::new, ITEMS);
        }

        @Bean
        public CommonRepository<SystemConfig> commonConfigs() {
            return new MemoryCommonRepository<>(SystemConfig::new, CONFIGS);
        }

        @Bean
        public CommonTransactions commonTransactions() {
            return new CommonTransactions(null);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
    static class Database {
        @Bean
        public CommonRepository<DictionaryType> commonTypes(DictionaryTypeMapper mapper) {
            return new DatabaseCommonRepository<>(mapper, TYPES);
        }

        @Bean
        public CommonRepository<DictionaryItem> commonItems(DictionaryItemMapper mapper) {
            return new DatabaseCommonRepository<>(mapper, ITEMS);
        }

        @Bean
        public CommonRepository<SystemConfig> commonConfigs(SystemConfigMapper mapper) {
            return new DatabaseCommonRepository<>(mapper, CONFIGS);
        }

        @Bean
        public CommonTransactions commonTransactions(PlatformTransactionManager manager) {
            return new CommonTransactions(new TransactionTemplate(manager));
        }
    }

    @Bean
    public DictionaryService dictionaryService(@Qualifier("commonTypes") CommonRepository<DictionaryType> types,
                                               @Qualifier("commonItems") CommonRepository<DictionaryItem> items, CommonConverter converter, CommonAccess access, CommonTransactions transactions) {
        return new DictionaryService(types, items, converter, access, transactions);
    }

    @Bean
    public SystemConfigService systemConfigService(@Qualifier("commonConfigs") CommonRepository<SystemConfig> configs,
                                                   CommonConverter converter, CommonAccess access, CommonTransactions transactions) {
        return new SystemConfigService(configs, converter, access, transactions);
    }
}
