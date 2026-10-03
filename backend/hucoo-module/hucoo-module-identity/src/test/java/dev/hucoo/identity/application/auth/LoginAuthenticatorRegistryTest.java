package dev.hucoo.identity.application.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;

class LoginAuthenticatorRegistryTest {

    @Test
    void selectsAuthenticatorByMethod() {
        LoginAuthenticator authenticator = new LoginAuthenticator() {
            @Override
            public AuthenticationMethod method() {
                return AuthenticationMethod.PASSWORD;
            }

            @Override
            public AuthenticatedIdentity authenticate(AuthenticationCommand command) {
                return new AuthenticatedIdentity(1L, command.identifier());
            }
        };

        LoginAuthenticatorRegistry registry = new LoginAuthenticatorRegistry(List.of(authenticator));

        assertEquals("alice", registry.authenticate(AuthenticationMethod.PASSWORD,
                new AuthenticationCommand("alice", "secret", "ADMIN_CONSOLE", null, null)).username());
    }

    @Test
    void rejectsMissingAuthenticator() {
        LoginAuthenticatorRegistry registry = new LoginAuthenticatorRegistry(List.of());

        assertThrows(BusinessException.class, () -> registry.authenticate(AuthenticationMethod.QQ,
                new AuthenticationCommand("subject", "code", "ADMIN_CONSOLE", null, null)));
    }
}
