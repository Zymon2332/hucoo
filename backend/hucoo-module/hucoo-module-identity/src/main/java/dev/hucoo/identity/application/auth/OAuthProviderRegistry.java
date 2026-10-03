package dev.hucoo.identity.application.auth;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;

@Component
public class OAuthProviderRegistry {

    private final Map<AuthenticationMethod, OAuthProviderAdapter> adapters;

    public OAuthProviderRegistry(List<OAuthProviderAdapter> adapters) {
        EnumMap<AuthenticationMethod, OAuthProviderAdapter> registry = new EnumMap<>(AuthenticationMethod.class);
        for (OAuthProviderAdapter adapter : adapters) {
            registry.put(adapter.provider(), adapter);
        }
        this.adapters = Map.copyOf(registry);
    }

    public OAuthProviderAdapter require(AuthenticationMethod provider) {
        OAuthProviderAdapter adapter = adapters.get(provider);
        if (adapter == null) {
            throw new BusinessException(CommonErrorCode.AUTH_PROVIDER_UNAVAILABLE,
                    "OAuth 提供方暂未配置: " + provider);
        }
        return adapter;
    }
}
