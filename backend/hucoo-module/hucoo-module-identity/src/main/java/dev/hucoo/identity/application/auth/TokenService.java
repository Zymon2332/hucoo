package dev.hucoo.identity.application.auth;

import java.util.List;

import dev.hucoo.identity.api.dto.AuthSessionDTO;
import dev.hucoo.identity.api.dto.AuthTokenResponse;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;

public interface TokenService {

    AuthTokenResponse issue(AuthIdentityUser user, String clientId, String tenantId, String deviceId,
                            List<String> availableTenantIds);

    AuthTokenResponse refresh(String refreshToken, String clientId, String deviceId);

    void revoke(String refreshToken);

    void revokeAll(Long userId);

    void revokeSession(Long userId, Long sessionId);

    List<AuthSessionDTO> sessions(Long userId);
}
