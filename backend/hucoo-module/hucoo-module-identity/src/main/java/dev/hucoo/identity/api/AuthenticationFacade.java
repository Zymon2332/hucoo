package dev.hucoo.identity.api;

import java.util.List;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.identity.api.dto.AuthLoginRequest;
import dev.hucoo.identity.api.dto.AuthOAuthAuthorizeResponse;
import dev.hucoo.identity.api.dto.AuthOAuthCallbackRequest;
import dev.hucoo.identity.api.dto.AuthOAuthCallbackResponse;
import dev.hucoo.identity.api.dto.AuthProviderDTO;
import dev.hucoo.identity.api.dto.AuthRefreshRequest;
import dev.hucoo.identity.api.dto.AuthRegisterRequest;
import dev.hucoo.identity.api.dto.AuthSessionDTO;
import dev.hucoo.identity.api.dto.AuthTokenResponse;
import dev.hucoo.identity.api.dto.AuthVerificationCodeRequest;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;

public interface AuthenticationFacade extends ModuleFacade {

    AuthRegisterResult register(AuthRegisterRequest request);

    AuthTokenResponse login(AuthLoginRequest request);

    AuthTokenResponse refresh(AuthRefreshRequest request);

    AuthOAuthAuthorizeResponse oauthAuthorize(String provider, String clientId, String redirectUri);

    AuthOAuthCallbackResponse oauthCallback(String provider, AuthOAuthCallbackRequest request);

    void logout(String refreshToken);

    AuthIdentityUser currentUser();

    List<AuthSessionDTO> sessions();

    void revokeSession(Long sessionId);

    List<AuthProviderDTO> providers();

    void sendVerificationCode(AuthVerificationCodeRequest request);

    void activate(Long userId, String tenantId);

    record AuthRegisterResult(Long userId, String username, String status) {
    }

    @Override
    default String moduleName() {
        return "hucoo-module-identity";
    }
}
