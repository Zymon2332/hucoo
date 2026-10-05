package dev.hucoo.modelgovernance.infrastructure.secret;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.modelgovernance.config.ModelVaultProperties;
import dev.hucoo.modelgovernance.domain.entity.ModelCredential;

/** AES-256-GCM；持久化模式必须显式提供主密钥，主密钥本身不会写入数据库。 */
@Component
public class ModelCredentialCipher {
    private final ModelVaultProperties properties;
    private final Map<String, SecretKeySpec> keys = new HashMap<>();
    private final SecureRandom random = new SecureRandom();

    public ModelCredentialCipher(ModelVaultProperties properties,
                                 @Value("${agent-platform.persistence.enabled:false}") boolean persistent) {
        this.properties = properties;
        properties.getKeys().forEach((version, encoded) -> {
            byte[] decoded = Base64.getDecoder().decode(encoded);
            if (decoded.length != 32) throw new IllegalStateException("模型保险箱主密钥必须是 Base64 编码的 32 字节密钥");
            keys.put(version, new SecretKeySpec(decoded, "AES"));
        });
        if (!keys.containsKey(properties.getActiveVersion())) {
            if (persistent) throw new IllegalStateException("持久化模型保险箱未配置当前版本主密钥");
            byte[] key = new byte[32];
            random.nextBytes(key);
            keys.put(properties.getActiveVersion(), new SecretKeySpec(key, "AES"));
        }
    }

    public void encrypt(ModelCredential credential, String secret) {
        try {
            byte[] nonce = new byte[12];
            random.nextBytes(nonce);
            credential.setEncryptionKeyId(properties.getKeyId());
            credential.setEncryptionKeyVersion(properties.getActiveVersion());
            Cipher cipher = cipher(Cipher.ENCRYPT_MODE, credential, nonce);
            credential.setSecretCiphertext(Base64.getEncoder().encodeToString(cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8))));
            credential.setSecretNonce(Base64.getEncoder().encodeToString(nonce));
            credential.setSecretFingerprint(fingerprint(secret));
            // 固定脱敏文本，连很短的密钥也不会被原样返回。
            credential.setMaskedValue("********");
        } catch (GeneralSecurityException error) {
            throw new BusinessException(CommonErrorCode.INTERNAL_ERROR, "凭证加密失败");
        }
    }

    public String decrypt(ModelCredential credential) {
        try {
            Cipher cipher = cipher(Cipher.DECRYPT_MODE, credential, Base64.getDecoder().decode(credential.getSecretNonce()));
            return new String(cipher.doFinal(Base64.getDecoder().decode(credential.getSecretCiphertext())), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, "凭证无法解密或完整性校验失败");
        }
    }

    private Cipher cipher(int mode, ModelCredential credential, byte[] nonce) throws GeneralSecurityException {
        SecretKeySpec key = keys.get(credential.getEncryptionKeyVersion());
        if (key == null || !properties.getKeyId().equals(credential.getEncryptionKeyId())) {
            throw new GeneralSecurityException("主密钥版本不可用");
        }
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, key, new GCMParameterSpec(128, nonce));
        cipher.updateAAD((credential.getTenantId() + ":" + credential.getChannelId()).getBytes(StandardCharsets.UTF_8));
        return cipher;
    }

    public String fingerprint(String secret) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8))); }
        catch (GeneralSecurityException error) { throw new IllegalStateException(error); }
    }
}
