package dev.hucoo.identity.application.auth;

import java.time.LocalDateTime;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.CryptoUtil;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;
import dev.hucoo.identity.domain.auth.entity.AuthLoginIdentity;
import dev.hucoo.identity.domain.auth.entity.AuthVerificationChallenge;
import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;
import dev.hucoo.identity.domain.auth.enums.VerificationChannel;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthIdentityUserMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthLoginIdentityMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthVerificationChallengeMapper;

public abstract class VerificationCodeLoginAuthenticator implements LoginAuthenticator {

    private final AuthIdentityUserMapper identityUserMapper;
    private final AuthLoginIdentityMapper loginIdentityMapper;
    private final AuthVerificationChallengeMapper challengeMapper;

    protected VerificationCodeLoginAuthenticator(AuthIdentityUserMapper identityUserMapper,
                                                 AuthLoginIdentityMapper loginIdentityMapper,
                                                 AuthVerificationChallengeMapper challengeMapper) {
        this.identityUserMapper = identityUserMapper;
        this.loginIdentityMapper = loginIdentityMapper;
        this.challengeMapper = challengeMapper;
    }

    protected abstract VerificationChannel channel();

    @Override
    public AuthenticatedIdentity authenticate(AuthenticationCommand command) {
        if (command.credential() == null || command.credential().isBlank()) {
            throw new BusinessException(CommonErrorCode.VERIFICATION_CODE_INVALID);
        }
        String destination = AuthenticationIdentifier.normalize(command.identifier());
        AuthVerificationChallenge challenge = challengeMapper.selectLatest(
                channel().name(), "LOGIN", destination);
        if (challenge == null || challenge.getConsumedAt() != null
                || challenge.getExpiresAt() == null
                || challenge.getExpiresAt().isBefore(LocalDateTime.now())
                || !CryptoUtil.secureEquals(challenge.getCodeHash(), CryptoUtil.sha256Hex(command.credential()))) {
            if (challenge != null) {
                challenge.setAttempts((challenge.getAttempts() == null ? 0 : challenge.getAttempts()) + 1);
                challengeMapper.updateById(challenge);
            }
            throw new BusinessException(CommonErrorCode.VERIFICATION_CODE_INVALID);
        }
        challenge.setConsumedAt(LocalDateTime.now());
        challengeMapper.updateById(challenge);
        AuthLoginIdentity identity = loginIdentityMapper.selectByIdentifier(method().name(), destination);
        if (identity == null) {
            throw new BusinessException(CommonErrorCode.AUTHENTICATION_FAILED);
        }
        AuthIdentityUser user = identityUserMapper.selectById(identity.getUserId());
        if (user == null) {
            throw new BusinessException(CommonErrorCode.USER_NOT_FOUND);
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("PENDING".equalsIgnoreCase(user.getStatus())
                    ? CommonErrorCode.ACCOUNT_PENDING_ACTIVATION : CommonErrorCode.USER_DISABLED);
        }
        return new AuthenticatedIdentity(user.getId(), user.getUsername());
    }
}
