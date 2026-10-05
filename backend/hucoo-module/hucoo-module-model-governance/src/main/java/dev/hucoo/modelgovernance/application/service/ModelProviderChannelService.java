package dev.hucoo.modelgovernance.application.service;

import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.modelgovernance.api.dto.*;
import dev.hucoo.modelgovernance.application.converter.ModelCatalogConverter;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.entity.*;
import static dev.hucoo.modelgovernance.domain.ModelConfigurationValidator.*;

/** Mock 与数据库模式共用相同的供应商、渠道业务规则。 */
@Service
@RequiredArgsConstructor
public class ModelProviderChannelService {
    private final ModelCatalogRepository repository;
    private final ModelCatalogConverter converter;

    public PageResult<ModelProviderDTO> pageProviders(ModelDefinitionQueryRequest query) {
        return page(repository.list(ModelProvider.class), query, provider -> matches(query.getKeyword(), provider.getProviderCode(), provider.getProviderName()), converter::toDto);
    }

    public ModelProviderDTO createProvider(ModelProviderCreateRequest request) {
        validateProvider(request, null);
        ModelProvider provider = converter.toEntity(request);
        provider.setProviderType(choice(request.getProviderType(), "OFFICIAL", "OFFICIAL", "CLOUD", "ENTERPRISE", "LOCAL", "PROXY"));
        provider.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        provider.setApprovalStatus("PENDING_APPROVAL");
        return converter.toDto(repository.save(provider));
    }

    public ModelProviderDTO updateProvider(Long id, ModelProviderCreateRequest request) {
        ModelProvider provider = required(ModelProvider.class, id);
        validateProvider(request, id);
        converter.update(request, provider);
        provider.setProviderType(choice(request.getProviderType(), "OFFICIAL", "OFFICIAL", "CLOUD", "ENTERPRISE", "LOCAL", "PROXY"));
        provider.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        provider.setApprovalStatus("PENDING_APPROVAL");
        return converter.toDto(repository.save(provider));
    }

    private void validateProvider(ModelProviderCreateRequest request, Long id) {
        choice(request.getProviderType(), "OFFICIAL", "OFFICIAL", "CLOUD", "ENTERPRISE", "LOCAL", "PROXY");
        require(request.getStatus() == null || request.getStatus() == 0 || request.getStatus() == 1, "供应商状态只能为 0 或 1");
        require(repository.list(ModelProvider.class).stream().noneMatch(provider -> !provider.getId().equals(id) && provider.getProviderCode().equals(request.getProviderCode())), "供应商编码已存在");
    }

    public boolean deleteProvider(Long id) {
        required(ModelProvider.class, id);
        require(repository.list(ModelChannel.class).stream().noneMatch(channel -> channel.getProviderId().equals(id)), "供应商仍有渠道，请先删除渠道");
        repository.delete(ModelProvider.class, id);
        return true;
    }

    public PageResult<ModelChannelDTO> pageChannels(Long providerId, ModelDefinitionQueryRequest query) {
        required(ModelProvider.class, providerId);
        return page(repository.list(ModelChannel.class), query,
                channel -> channel.getProviderId().equals(providerId) && matches(query.getKeyword(), channel.getChannelCode(), channel.getChannelName()), converter::toDto);
    }

    public ModelChannelDTO createChannel(Long providerId, ModelChannelCreateRequest request) {
        required(ModelProvider.class, providerId);
        validateChannel(providerId, null, request);
        ModelChannel channel = converter.toEntity(request);
        channel.setProviderId(providerId);
        defaults(channel);
        return converter.toDto(repository.save(channel));
    }

    public ModelChannelDTO updateChannel(Long id, ModelChannelCreateRequest request) {
        ModelChannel channel = required(ModelChannel.class, id);
        validateChannel(channel.getProviderId(), id, request);
        converter.update(request, channel);
        defaults(channel);
        channel.setLastHealthCheckedAt(null);
        return converter.toDto(repository.save(channel));
    }

    private void validateChannel(Long providerId, Long id, ModelChannelCreateRequest request) {
        choice(request.getProtocolType(), null, "OPENAI_COMPATIBLE", "ANTHROPIC", "GEMINI", "OLLAMA", "VLLM", "CUSTOM");
        choice(request.getAuthType(), "API_KEY", "API_KEY", "OAUTH2", "MTLS", "NONE");
        choice(request.getStatus(), "ACTIVE", "ACTIVE", "DRAINING", "DISABLED", "REVOKED");
        require(request.getRequestTimeoutMs() == null || request.getRequestTimeoutMs() > 0, "请求超时必须大于零");
        require(request.getStreamTimeoutMs() == null || request.getStreamTimeoutMs() > 0, "流式超时必须大于零");
        endpoint(request.getEndpoint());
        json(request.getProtocolConfigJson(), true);
        require(repository.list(ModelChannel.class).stream().noneMatch(channel -> !channel.getId().equals(id) && channel.getProviderId().equals(providerId) && channel.getChannelCode().equals(request.getChannelCode())), "供应商内渠道编码已存在");
    }

    private void defaults(ModelChannel channel) {
        channel.setAuthType(channel.getAuthType() == null ? "API_KEY" : channel.getAuthType());
        channel.setStatus(channel.getStatus() == null ? "ACTIVE" : channel.getStatus());
        channel.setRequestTimeoutMs(channel.getRequestTimeoutMs() == null ? 30000L : channel.getRequestTimeoutMs());
        channel.setStreamTimeoutMs(channel.getStreamTimeoutMs() == null ? 60000L : channel.getStreamTimeoutMs());
        channel.setApprovalStatus("PENDING_APPROVAL");
        channel.setHealthStatus("UNKNOWN");
    }

    public boolean deleteChannel(Long id) {
        required(ModelChannel.class, id);
        require(repository.list(ModelChannelBinding.class).stream().noneMatch(binding -> binding.getChannelId().equals(id)), "渠道仍有模型映射，请先删除映射");
        require(repository.list(ModelCredential.class).stream().noneMatch(credential -> credential.getChannelId().equals(id) && !"REVOKED".equals(credential.getStatus())), "渠道仍有有效凭证，请先撤销凭证");
        repository.delete(ModelChannel.class, id);
        return true;
    }

    private <T extends BaseEntity> T required(Class<T> type, Long id) {
        T value = repository.find(type, id);
        if (value == null) throw new ResourceNotFoundException(type.getSimpleName(), id);
        return value;
    }

    private boolean matches(String keyword, String code, String name) {
        return keyword == null || keyword.isBlank() || code.contains(keyword) || name.contains(keyword);
    }

    private <T, R> PageResult<R> page(List<T> values, ModelDefinitionQueryRequest query, Predicate<T> predicate, Function<T, R> convert) {
        List<T> selected = values.stream().filter(predicate).toList();
        long page = query.resolvePageNum(), size = query.resolvePageSize();
        int start = (int) Math.min(selected.size(), (page - 1) * size);
        int end = (int) Math.min(selected.size(), start + size);
        return PageResult.of(selected.subList(start, end).stream().map(convert).toList(), selected.size(), page, size);
    }
}
