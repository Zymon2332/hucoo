package dev.hucoo.identity.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthCurrentUserDTO {

    private Long userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String status;
}
