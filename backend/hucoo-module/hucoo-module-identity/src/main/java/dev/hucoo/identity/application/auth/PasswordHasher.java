package dev.hucoo.identity.application.auth;

import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.spec.PBEKeySpec;
import javax.crypto.SecretKeyFactory;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.util.CryptoUtil;

@Component
public class PasswordHasher {

    private static final String PREFIX = "pbkdf2-sha256";
    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_LENGTH = 16;

    private final SecureRandom secureRandom = new SecureRandom();

    public String hash(String password) {
        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);
        byte[] derived = derive(password, salt, ITERATIONS, KEY_LENGTH);
        return PREFIX + "$" + ITERATIONS + "$"
                + Base64.getUrlEncoder().withoutPadding().encodeToString(salt) + "$"
                + Base64.getUrlEncoder().withoutPadding().encodeToString(derived);
    }

    public boolean matches(String password, String encoded) {
        try {
            String[] parts = encoded.split("\\$", -1);
            if (parts.length != 4 || !PREFIX.equals(parts[0])) {
                return false;
            }
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = Base64.getUrlDecoder().decode(parts[2]);
            byte[] expected = Base64.getUrlDecoder().decode(parts[3]);
            byte[] actual = derive(password, salt, iterations, expected.length * 8);
            return CryptoUtil.secureEquals(
                    Base64.getUrlEncoder().withoutPadding().encodeToString(expected),
                    Base64.getUrlEncoder().withoutPadding().encodeToString(actual));
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private byte[] derive(String password, byte[] salt, int iterations, int keyLength) {
        try {
            PBEKeySpec specification = new PBEKeySpec(password.toCharArray(), salt, iterations, keyLength);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                    .generateSecret(specification)
                    .getEncoded();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("password hashing failed", exception);
        }
    }
}
