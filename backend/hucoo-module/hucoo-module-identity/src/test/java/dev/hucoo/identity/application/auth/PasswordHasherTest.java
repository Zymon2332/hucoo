package dev.hucoo.identity.application.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PasswordHasherTest {

    private final PasswordHasher passwordHasher = new PasswordHasher();

    @Test
    void hashesAndVerifiesPasswordWithoutStoringPlaintext() {
        String encoded = passwordHasher.hash("correct horse battery staple");

        assertNotEquals("correct horse battery staple", encoded);
        assertTrue(passwordHasher.matches("correct horse battery staple", encoded));
        assertFalse(passwordHasher.matches("incorrect password", encoded));
    }

    @Test
    void rejectsMalformedHash() {
        assertFalse(passwordHasher.matches("password", "not-a-password-hash"));
    }
}
