package dev.hucoo.identity.application.auth;

import dev.hucoo.identity.domain.auth.enums.VerificationChannel;
import dev.hucoo.identity.domain.auth.enums.VerificationPurpose;

public interface VerificationCodeSender {

    VerificationChannel channel();

    void send(String destination, String code, VerificationPurpose purpose);
}
