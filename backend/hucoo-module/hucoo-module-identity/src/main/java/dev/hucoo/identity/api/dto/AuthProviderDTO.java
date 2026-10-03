package dev.hucoo.identity.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthProviderDTO {

    private String method;
    private boolean enabled;
}
