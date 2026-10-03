package dev.hucoo.identity.application.auth;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;

@Component
public class LoginAuthenticatorRegistry {

    private final Map<AuthenticationMethod, LoginAuthenticator> authenticators;

    public LoginAuthenticatorRegistry(List<LoginAuthenticator> authenticators) {
        EnumMap<AuthenticationMethod, LoginAuthenticator> registry = new EnumMap<>(AuthenticationMethod.class);
        for (LoginAuthenticator authenticator : authenticators) {
            registry.put(authenticator.method(), authenticator);
        }
        this.authenticators = Map.copyOf(registry);
    }

    public AuthenticatedIdentity authenticate(AuthenticationMethod method, AuthenticationCommand command) {
        LoginAuthenticator authenticator = authenticators.get(method);
        if (authenticator == null) {
            throw new BusinessException(CommonErrorCode.AUTH_PROVIDER_UNAVAILABLE,
                    "认证方式暂未接入: " + method);
        }
        return authenticator.authenticate(command);
    }

    public boolean supports(AuthenticationMethod method) {
        return authenticators.containsKey(method);
    }
}
