package dev.hucoo.modelgovernance.application.service;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.modelgovernance.api.dto.CustomModelRegistrationCreateRequest;
import dev.hucoo.modelgovernance.api.dto.CustomModelRegistrationDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.api.dto.ModelKeyCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelKeyDTO;
import dev.hucoo.modelgovernance.api.dto.ModelProviderCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelProviderDTO;
import dev.hucoo.modelgovernance.api.dto.RoutingRuleCreateRequest;
import dev.hucoo.modelgovernance.api.dto.RoutingRuleDTO;

public interface ModelGovernanceCatalogFacade {
    PageResult<ModelProviderDTO> pageProviders(ModelDefinitionQueryRequest request);
    ModelProviderDTO createProvider(ModelProviderCreateRequest request);
    ModelProviderDTO updateProvider(Long id, ModelProviderCreateRequest request);
    boolean deleteProvider(Long id);
    PageResult<CustomModelRegistrationDTO> pageCustom(ModelDefinitionQueryRequest request);
    CustomModelRegistrationDTO createCustom(CustomModelRegistrationCreateRequest request);
    CustomModelRegistrationDTO updateCustom(Long id, CustomModelRegistrationCreateRequest request);
    boolean deleteCustom(Long id);
    PageResult<ModelKeyDTO> pageKeys(ModelDefinitionQueryRequest request);
    ModelKeyDTO createKey(ModelKeyCreateRequest request);
    ModelKeyDTO rotateKey(Long id, ModelKeyCreateRequest request);
    ModelKeyDTO revokeKey(Long id);
    PageResult<RoutingRuleDTO> pageRouting(ModelDefinitionQueryRequest request);
    RoutingRuleDTO createRouting(RoutingRuleCreateRequest request);
    RoutingRuleDTO updateRouting(Long id, RoutingRuleCreateRequest request);
    boolean deleteRouting(Long id);
}
