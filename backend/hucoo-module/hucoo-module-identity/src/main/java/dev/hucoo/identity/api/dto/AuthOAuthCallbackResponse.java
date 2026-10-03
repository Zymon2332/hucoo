package dev.hucoo.identity.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthOAuthCallbackResponse {

    private String provider;
    private String subject;
    private String displayName;
    private String email;
    private boolean bound;
    private AuthTokenResponse token;
}
