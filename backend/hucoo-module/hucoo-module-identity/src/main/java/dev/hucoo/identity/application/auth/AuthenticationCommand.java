package dev.hucoo.identity.application.auth;

public record AuthenticationCommand(String identifier,
                                    String credential,
                                    String clientId,
                                    String tenantId,
                                    String deviceId) {
}
