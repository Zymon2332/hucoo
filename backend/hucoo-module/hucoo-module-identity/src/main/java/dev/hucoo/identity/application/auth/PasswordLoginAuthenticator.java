package dev.hucoo.identity.application.auth;

import java.time.LocalDateTime;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.identity.config.AuthenticationProperties;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;
import dev.hucoo.identity.domain.auth.entity.AuthLoginIdentity;
import dev.hucoo.identity.domain.auth.entity.AuthPasswordCredential;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthIdentityUserMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthLoginIdentityMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthPasswordCredentialMapper;

import lombok.RequiredArgsConstructor;

@Component
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class PasswordLoginAuthenticator implements LoginAuthenticator {

    private final AuthIdentityUserMapper identityUserMapper;
    private final AuthLoginIdentityMapper loginIdentityMapper;
    private final AuthPasswordCredentialMapper passwordCredentialMapper;
    private final PasswordHasher passwordHasher;
    private final AuthenticationProperties properties;

    @Override
    public AuthenticationMethod method() {
        return AuthenticationMethod.PASSWORD;
    }

    @Override
    public AuthenticatedIdentity authenticate(AuthenticationCommand command) {
        if (StringUtil.isBlank(command.credential())) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_FAILED);
        }
        String identifier = AuthenticationIdentifier.normalize(command.identifier());
        AuthLoginIdentity loginIdentity = loginIdentityMapper.selectByIdentifier(method().name(), identifier);
        if (loginIdentity == null) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_FAILED);
        }
        AuthIdentityUser user = identityUserMapper.selectById(loginIdentity.getUserId());
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            if ("PENDING".equalsIgnoreCase(user.getStatus())) {
                throw new BusinessException(CommonErrorCode.ACCOUNT_PENDING_ACTIVATION);
            }
            throw new BusinessException(CommonErrorCode.USER_DISABLED);
        }
        AuthPasswordCredential credential = passwordCredentialMapper.selectByUserId(user.getId());
        if (credential == null || isLocked(credential) || !passwordHasher.matches(command.credential(), credential.getPasswordHash())) {
            recordFailure(credential);
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_FAILED);
        }
        resetFailures(credential);
        return new AuthenticatedIdentity(user.getId(), user.getUsername());
    }

    private boolean isLocked(AuthPasswordCredential credential) {
        return credential.getLockedUntil() != null && credential.getLockedUntil().isAfter(LocalDateTime.now());
    }

    private void recordFailure(AuthPasswordCredential credential) {
        if (credential == null) {
            return;
        }
        int failures = credential.getFailedAttempts() == null ? 0 : credential.getFailedAttempts();
        failures++;
        credential.setFailedAttempts(failures);
        if (failures >= properties.getLoginFailureThreshold()) {
            credential.setLockedUntil(LocalDateTime.now().plusMinutes(properties.getLoginLockMinutes()));
        }
        passwordCredentialMapper.updateById(credential);
    }

    private void resetFailures(AuthPasswordCredential credential) {
        if (credential.getFailedAttempts() != null && credential.getFailedAttempts() > 0) {
            credential.setFailedAttempts(0);
            credential.setLockedUntil(null);
            passwordCredentialMapper.updateById(credential);
        }
    }
}
