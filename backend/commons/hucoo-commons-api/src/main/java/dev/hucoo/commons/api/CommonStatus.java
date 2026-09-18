package dev.hucoo.commons.api;

public enum CommonStatus {

    DISABLED(0, "disabled"),
    ENABLED(1, "enabled");

    private final int code;
    private final String description;

    CommonStatus(int code, String description) {
        this.code = code;
        this.description = description;
    }

    public int getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }
}
