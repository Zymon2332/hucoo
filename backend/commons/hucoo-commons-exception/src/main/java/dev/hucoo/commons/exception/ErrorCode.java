package dev.hucoo.commons.exception;

public interface ErrorCode {

    int getCode();

    String getMessage();

    default String getModule() {
        return "platform";
    }
}
