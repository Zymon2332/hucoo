package dev.hucoo.identity.application.auth;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.identity.domain.auth.enums.VerificationChannel;
import dev.hucoo.identity.domain.auth.enums.VerificationPurpose;

@Component
public class VerificationCodeSenderRegistry {

    private final Map<VerificationChannel, VerificationCodeSender> senders;

    public VerificationCodeSenderRegistry(List<VerificationCodeSender> senders) {
        EnumMap<VerificationChannel, VerificationCodeSender> registry = new EnumMap<>(VerificationChannel.class);
        for (VerificationCodeSender sender : senders) {
            registry.put(sender.channel(), sender);
        }
        this.senders = Map.copyOf(registry);
    }

    public void send(VerificationChannel channel, String destination, String code, VerificationPurpose purpose) {
        VerificationCodeSender sender = senders.get(channel);
        if (sender == null) {
            throw new BusinessException(CommonErrorCode.AUTH_PROVIDER_UNAVAILABLE,
                    "验证码发送渠道暂未配置: " + channel);
        }
        sender.send(destination, code, purpose);
    }
}
