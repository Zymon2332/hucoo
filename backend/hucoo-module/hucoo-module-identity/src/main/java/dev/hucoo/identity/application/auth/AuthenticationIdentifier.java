package dev.hucoo.identity.application.auth;

import java.util.Locale;

import dev.hucoo.commons.util.StringUtil;

public final class AuthenticationIdentifier {

    private AuthenticationIdentifier() {
    }

    public static String normalize(String identifier) {
        return StringUtil.defaultIfBlank(identifier, "").trim().toLowerCase(Locale.ROOT);
    }

    public static boolean looksLikeEmail(String identifier) {
        return identifier != null && identifier.contains("@");
    }
}
