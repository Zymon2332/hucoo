package dev.hucoo.identity.application.auth;

import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;

public interface LoginAuthenticator {

    AuthenticationMethod method();

    AuthenticatedIdentity authenticate(AuthenticationCommand command);
}
