package dev.hucoo.identity.application.auth;

import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;

public interface OAuthProviderAdapter {

    AuthenticationMethod provider();

    String authorize(String clientId, String redirectUri, String state);

    ExternalIdentity exchange(String code, String state);

    record ExternalIdentity(String provider, String subject, String displayName, String email) {
    }
}
