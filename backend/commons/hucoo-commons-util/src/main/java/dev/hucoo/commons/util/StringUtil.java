package dev.hucoo.commons.util;

public final class StringUtil {

    private StringUtil() {
    }

    public static boolean isBlank(String text) {
        return text == null || text.isBlank();
    }

    public static boolean isNotBlank(String text) {
        return !isBlank(text);
    }

    public static String defaultIfBlank(String text, String defaultValue) {
        return isBlank(text) ? defaultValue : text;
    }

    public static String camelToSnake(String text) {
        if (isBlank(text)) {
            return text;
        }
        StringBuilder builder = new StringBuilder(text.length() + 8);
        for (int i = 0; i < text.length(); i++) {
            char current = text.charAt(i);
            if (Character.isUpperCase(current)) {
                if (i > 0) {
                    builder.append('_');
                }
                builder.append(Character.toLowerCase(current));
            } else {
                builder.append(current);
            }
        }
        return builder.toString();
    }

    public static String snakeToCamel(String text) {
        if (isBlank(text)) {
            return text;
        }
        StringBuilder builder = new StringBuilder(text.length());
        boolean upperNext = false;
        for (int i = 0; i < text.length(); i++) {
            char current = text.charAt(i);
            if (current == '_') {
                upperNext = true;
                continue;
            }
            builder.append(upperNext ? Character.toUpperCase(current) : current);
            upperNext = false;
        }
        return builder.toString();
    }

    public static String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }

    public static String maskPhone(String phone) {
        if (isBlank(phone) || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    public static String maskEmail(String email) {
        if (isBlank(email) || !email.contains("@")) {
            return email;
        }
        int atIndex = email.indexOf('@');
        String localPart = email.substring(0, atIndex);
        if (localPart.length() <= 2) {
            return "*".repeat(localPart.length()) + email.substring(atIndex);
        }
        return localPart.charAt(0) + "*".repeat(localPart.length() - 2) + localPart.charAt(localPart.length() - 1)
                + email.substring(atIndex);
    }
}
