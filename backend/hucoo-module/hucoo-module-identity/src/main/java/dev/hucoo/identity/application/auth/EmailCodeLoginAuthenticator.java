package dev.hucoo.identity.application.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import dev.hucoo.identity.domain.auth.enums.AuthenticationMethod;
import dev.hucoo.identity.domain.auth.enums.VerificationChannel;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthIdentityUserMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthLoginIdentityMapper;
import dev.hucoo.identity.infrastructure.auth.mapper.AuthVerificationChallengeMapper;

@Component
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class EmailCodeLoginAuthenticator extends VerificationCodeLoginAuthenticator {

    public EmailCodeLoginAuthenticator(AuthIdentityUserMapper identityUserMapper,
                                       AuthLoginIdentityMapper loginIdentityMapper,
                                       AuthVerificationChallengeMapper challengeMapper) {
        super(identityUserMapper, loginIdentityMapper, challengeMapper);
    }

    @Override
    public AuthenticationMethod method() {
        return AuthenticationMethod.EMAIL;
    }

    @Override
    protected VerificationChannel channel() {
        return VerificationChannel.EMAIL;
    }
}
