package dev.hucoo.identity.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthOAuthAuthorizeResponse {

    private String provider;
    private String authorizationUrl;
    private String state;
}
